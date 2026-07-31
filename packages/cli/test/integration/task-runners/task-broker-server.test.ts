import http from 'node:http';

import { setupBrokerTestServer } from '@test-integration/utils/task-broker-test-server';

describe('TaskBrokerServer', () => {
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

	describe('/runners/_ws', () => {
		/** Sends an HTTP upgrade request and resolves with the raw status line */
		const sendUpgradeRequest = async () =>
			await new Promise<number>((resolve, reject) => {
				const req = http.get(
					{
						hostname: '127.0.0.1',
						port: server.port,
						path: '/runners/_ws?id=runner1',
						headers: {
							Connection: 'Upgrade',
							Upgrade: 'websocket',
							'Sec-WebSocket-Version': '13',
							'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
						},
					},
					(res) => resolve(res.statusCode ?? 0),
				);
				req.on('upgrade', (_res, socket) => {
					// If the upgrade somehow succeeds, close immediately
					socket.destroy();
					resolve(200);
				});
				req.on('error', reject);
			});

		it('should return 429 when too many upgrade requests are made', async () => {
			// First 5 should be allowed (will fail auth with 401, but not rate-limited)
			for (let i = 0; i < 5; i++) {
				const status = await sendUpgradeRequest();
				expect(status).toBe(401);
			}

			// 6th should be rate-limited
			const status = await sendUpgradeRequest();
			expect(status).toBe(429);
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
