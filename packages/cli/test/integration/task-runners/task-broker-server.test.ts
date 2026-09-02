import http from 'node:http';
import request from 'supertest';

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
			// The rate limiter allows 5 requests per 1s window. Fire all requests
			// concurrently so they land within the same window — sending them
			// sequentially can exceed 1s on a slow runner, resetting the counter.
			// Each request uses its own connection (not the shared keep-alive
			// agent) so a rate-limited response can't reset a sibling request.
			const responseStatusCodes = await Promise.all(Array.from({ length: 6 }, sendUpgradeRequest));

			expect(responseStatusCodes.filter((code) => code === 401)).toHaveLength(5);
			expect(responseStatusCodes.filter((code) => code === 429)).toHaveLength(1);
		});
	});

	describe('/runners/auth', () => {
		it('should return 429 when too many requests are made', async () => {
			// The rate limiter allows 5 requests per 1s window. Fire all requests
			// concurrently so they land within the same window — sending them
			// sequentially can exceed 1s on a slow runner, resetting the counter.
			// Each request uses its own connection (not the shared keep-alive
			// agent) so a rate-limited response can't reset a sibling request.
			const responses = await Promise.all(
				Array.from(
					{ length: 6 },
					async () => await request(server.app).post('/runners/auth').send({ token: 'invalid' }),
				),
			);

			const statusCodes = responses.map((res) => res.status);
			expect(statusCodes.filter((code) => code === 403)).toHaveLength(5);
			expect(statusCodes.filter((code) => code === 429)).toHaveLength(1);
		});
	});
});
