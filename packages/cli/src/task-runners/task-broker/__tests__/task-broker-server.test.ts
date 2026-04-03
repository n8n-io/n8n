import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { Socket } from 'node:net';
import request from 'supertest';
import type { Server as WSServer, WebSocket } from 'ws';

import type { TaskBrokerAuthController } from '@/task-runners/task-broker/auth/task-broker-auth.controller';
import { TaskBrokerServer } from '@/task-runners/task-broker/task-broker-server';
import type { TaskBrokerServerInitRequest } from '@/task-runners/task-broker/task-broker-types';
import type { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';

describe('TaskBrokerServer', () => {
	const createServer = (overrides?: {
		authController?: TaskBrokerAuthController;
	}) => {
		const authController = overrides?.authController ?? mock<TaskBrokerAuthController>();
		const taskBrokerWsServer = mock<TaskBrokerWsServer>();

		const server = new TaskBrokerServer(
			mock(),
			mock<GlobalConfig>({
				taskRunners: { path: '/runners', authToken: 'token' },
				endpoints: { health: '/health' },
				sentry: { backendDsn: '' },
			}),
			authController,
			taskBrokerWsServer,
			mock(),
		);

		return { server, authController, taskBrokerWsServer };
	};

	describe('GET /healthz', () => {
		it('should return 200 regardless of N8N_ENDPOINT_HEALTH', async () => {
			const { server } = createServer();

			// @ts-expect-error Private method
			server.setupCommonMiddlewares();
			// @ts-expect-error Private method
			server.configureRoutes();

			await request(server.app).get('/healthz').expect(200, { status: 'ok' });
		});
	});

	describe('handleUpgradeRequest', () => {
		const createSocket = () => {
			const socket = mock<Socket>();
			socket.write.mockReturnValue(true);
			return socket;
		};

		it('should return 404 when path does not match', async () => {
			const { server } = createServer();
			const socket = createSocket();

			// @ts-expect-error Private property
			await server.handleUpgradeRequest(
				mock<TaskBrokerServerInitRequest>({ url: '/wrong-path' }),
				socket,
				Buffer.from(''),
			);

			expect(socket.write).toHaveBeenCalledWith('HTTP/1.1 404 Not Found\r\n\r\n');
			expect(socket.destroy).toHaveBeenCalled();
		});

		it('should return 401 when auth validation fails with 401', async () => {
			const authController = mock<TaskBrokerAuthController>();
			authController.validateUpgradeRequest.mockResolvedValue({
				isValid: false,
				statusCode: 401,
				reason: 'missing or invalid Authorization header',
			});

			const { server } = createServer({ authController });
			const socket = createSocket();

			// @ts-expect-error Private property - set wsServer to simulate started server
			server.wsServer = mock<WSServer>();

			// @ts-expect-error Private property
			await server.handleUpgradeRequest(
				mock<TaskBrokerServerInitRequest>({ url: '/runners/_ws?id=runner1', headers: {} }),
				socket,
				Buffer.from(''),
			);

			expect(socket.write).toHaveBeenCalledWith('HTTP/1.1 401 Unauthorized\r\n\r\n');
			expect(socket.destroy).toHaveBeenCalled();
		});

		it('should return 403 when grant token is invalid', async () => {
			const authController = mock<TaskBrokerAuthController>();
			authController.validateUpgradeRequest.mockResolvedValue({
				isValid: false,
				statusCode: 403,
				reason: 'invalid or expired grant token',
			});

			const { server } = createServer({ authController });
			const socket = createSocket();

			// @ts-expect-error Private property
			server.wsServer = mock<WSServer>();

			// @ts-expect-error Private property
			await server.handleUpgradeRequest(
				mock<TaskBrokerServerInitRequest>({
					url: '/runners/_ws?id=runner1',
					headers: { authorization: 'Bearer invalid-token' },
				}),
				socket,
				Buffer.from(''),
			);

			expect(authController.validateUpgradeRequest).toHaveBeenCalledWith('Bearer invalid-token');
			expect(socket.write).toHaveBeenCalledWith('HTTP/1.1 403 Forbidden\r\n\r\n');
			expect(socket.destroy).toHaveBeenCalled();
		});

		it('should return 429 when rate limit is exceeded', async () => {
			const authController = mock<TaskBrokerAuthController>();
			authController.validateUpgradeRequest.mockResolvedValue({
				isValid: false,
				statusCode: 401,
				reason: 'missing or invalid Authorization header',
			});

			const { server } = createServer({ authController });
			const wsServerMock = mock<WSServer>();

			// @ts-expect-error Private property
			server.wsServer = wsServerMock;

			// Send 5 requests (the limit)
			for (let i = 0; i < 5; i++) {
				const socket = createSocket();
				// @ts-expect-error Private property
				await server.handleUpgradeRequest(
					mock<TaskBrokerServerInitRequest>({
						url: '/runners/_ws?id=runner1',
						headers: {},
					}),
					socket,
					Buffer.from(''),
				);
				// These should fail auth (401), not rate limit
				expect(socket.write).toHaveBeenCalledWith('HTTP/1.1 401 Unauthorized\r\n\r\n');
			}

			// 6th should be rate limited
			const socket = createSocket();
			// @ts-expect-error Private property
			await server.handleUpgradeRequest(
				mock<TaskBrokerServerInitRequest>({
					url: '/runners/_ws?id=runner1',
					headers: {},
				}),
				socket,
				Buffer.from(''),
			);
			expect(socket.write).toHaveBeenCalledWith('HTTP/1.1 429 Too Many Requests\r\n\r\n');
			expect(socket.destroy).toHaveBeenCalled();
		});

		it('should proceed with upgrade when grant token is valid', async () => {
			const authController = mock<TaskBrokerAuthController>();
			authController.validateUpgradeRequest.mockResolvedValue({
				isValid: true,
				statusCode: 200,
			});

			const { server, taskBrokerWsServer } = createServer({ authController });
			const socket = createSocket();

			const wsServerMock = mock<WSServer>();
			const mockWs = mock<WebSocket>();
			wsServerMock.handleUpgrade.mockImplementation(
				(_req: unknown, _socket: unknown, _head: unknown, cb: (ws: WebSocket) => void) => {
					cb(mockWs);
				},
			);

			// @ts-expect-error Private property
			server.wsServer = wsServerMock;

			// @ts-expect-error Private property
			await server.handleUpgradeRequest(
				mock<TaskBrokerServerInitRequest>({
					url: '/runners/_ws?id=runner1',
					headers: { authorization: 'Bearer valid-token' },
				}),
				socket,
				Buffer.from(''),
			);

			expect(authController.validateUpgradeRequest).toHaveBeenCalledWith('Bearer valid-token');
			expect(wsServerMock.handleUpgrade).toHaveBeenCalled();
			expect(taskBrokerWsServer.add).toHaveBeenCalledWith('runner1', mockWs);
			expect(socket.destroy).not.toHaveBeenCalled();
		});
	});
});
