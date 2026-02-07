import supertest from 'supertest';
import { TestServerFixture } from 'src/tests/fixtures';

describe('Webinar Routes E2E', () => {
  let fixture: TestServerFixture;

  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.reset();
  });

  afterAll(async () => {
    await fixture.stop();
  });

  describe('Change Seats E2E', () => {
    describe('Scenario: happy path', () => {
      it('should update webinar seats', async () => {
        // ARRANGE
        const prisma = fixture.getPrismaClient();
        const server = fixture.getServer();

        const webinar = await prisma.webinar.create({
          data: {
            id: 'test-webinar',
            title: 'Webinar Test',
            seats: 10,
            startDate: new Date(),
            endDate: new Date(),
            organizerId: 'test-user',
          },
        });

        // ACT
        const response = await supertest(server)
          .post(`/webinars/${webinar.id}/seats`)
          .send({ seats: '30' })
          .expect(200);

        // ASSERT
        expect(response.body).toEqual({ message: 'Seats updated' });

        const updatedWebinar = await prisma.webinar.findUnique({
          where: { id: webinar.id },
        });
        expect(updatedWebinar?.seats).toBe(30);
      });
    });

    describe('Scenario: webinar not found', () => {
      it('should return 404 when webinar does not exist', async () => {
        // ARRANGE
        const server = fixture.getServer();

        // ACT & ASSERT
        const response = await supertest(server)
          .post(`/webinars/non-existent/seats`)
          .send({ seats: '30' })
          .expect(404);

        expect(response.body.error).toBeDefined();
      });
    });

    describe('Scenario: user is not organizer', () => {
      it('should return 401 when user is not organizer', async () => {
        // ARRANGE
        const prisma = fixture.getPrismaClient();
        const server = fixture.getServer();

        const webinar = await prisma.webinar.create({
          data: {
            id: 'test-webinar',
            title: 'Webinar Test',
            seats: 10,
            startDate: new Date(),
            endDate: new Date(),
            organizerId: 'other-user',
          },
        });

        // ACT & ASSERT
        const response = await supertest(server)
          .post(`/webinars/${webinar.id}/seats`)
          .send({ seats: '30' })
          .expect(401);

        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('Organize Webinar E2E', () => {
    describe('Scenario: happy path', () => {
      it('should create a webinar', async () => {
        // ARRANGE
        const server = fixture.getServer();
        const startDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
        const endDate = new Date(startDate.getTime() + 3600 * 1000);

        // ACT
        const response = await supertest(server)
          .post('/webinars')
          .send({
            title: 'New Webinar',
            seats: '100',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          })
          .expect(201);

        // ASSERT
        expect(response.body.id).toBeDefined();

        const prisma = fixture.getPrismaClient();
        const createdWebinar = await prisma.webinar.findUnique({
          where: { id: response.body.id },
        });

        expect(createdWebinar?.title).toBe('New Webinar');
        expect(createdWebinar?.seats).toBe(100);
      });
    });

    describe('Scenario: webinar happens too soon', () => {
      it('should return 400 when webinar is scheduled too soon', async () => {
        // ARRANGE
        const server = fixture.getServer();
        const startDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day from now
        const endDate = new Date(startDate.getTime() + 3600 * 1000);

        // ACT & ASSERT
        const response = await supertest(server)
          .post('/webinars')
          .send({
            title: 'Too Soon Webinar',
            seats: '100',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          })
          .expect(400);

        expect(response.body.error).toBeDefined();
      });
    });

    describe('Scenario: too many seats', () => {
      it('should return 400 when webinar has too many seats', async () => {
        // ARRANGE
        const server = fixture.getServer();
        const startDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
        const endDate = new Date(startDate.getTime() + 3600 * 1000);

        // ACT & ASSERT
        const response = await supertest(server)
          .post('/webinars')
          .send({
            title: 'Too Many Seats',
            seats: '1500',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          })
          .expect(400);

        expect(response.body.error).toBeDefined();
      });
    });
  });
});
