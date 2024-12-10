import { setupBrokerTestServer } from '@test-integration/utils/task-broker-test-server';

describe('TaskRunnerServer', () => {
	const { agent, server } = setupBrokerTestServer({
		authToken: 'token',
		mode: 'external',
	});

	beforeAll(async () => {
		await server.start();
	});

	afterAll(async () => {
		await server.stop();
	});

	describe('/healthz', () => {
		it('should return 200', async () => {
			await agent.get('/healthz').expect(200);
		});
	});
});
