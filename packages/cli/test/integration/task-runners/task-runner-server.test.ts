import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { setupBrokerTestServer } from '@test-integration/utils/task-broker-test-server';

describe('TaskBrokerServer', () => {
	const { agent, server } = setupBrokerTestServer({
		authToken: 'token',
		mode: 'external',
	});

	beforeAll(async () => {
		// Use custom test value to prove configuration is respected
		Container.get(GlobalConfig).endpoints.health = 'internal/health';
		await server.start();
	});

	afterAll(async () => {
		await server.stop();
	});

	describe('/internal/health', () => {
		it('should return 200', async () => {
			await agent.get('/internal/health').expect(200);
		});
	});

	describe('/runners/_ws', () => {
		it('should return 429 when too many requests are made', async () => {
			await agent.post('/runners/_ws').send({}).expect(401);
			await agent.post('/runners/_ws').send({}).expect(401);
			await agent.post('/runners/_ws').send({}).expect(401);
			await agent.post('/runners/_ws').send({}).expect(401);
			await agent.post('/runners/_ws').send({}).expect(401);
			await agent.post('/runners/_ws').send({}).expect(429);
		});
	});

	describe('/runners/auth', () => {
		it('should return 429 when too many requests are made', async () => {
			await agent.post('/runners/auth').send({ token: 'invalid' }).expect(403);
			await agent.post('/runners/auth').send({ token: 'invalid' }).expect(403);
			await agent.post('/runners/auth').send({ token: 'invalid' }).expect(403);
			await agent.post('/runners/auth').send({ token: 'invalid' }).expect(403);
			await agent.post('/runners/auth').send({ token: 'invalid' }).expect(403);
			await agent.post('/runners/auth').send({ token: 'invalid' }).expect(429);
		});
	});
});
