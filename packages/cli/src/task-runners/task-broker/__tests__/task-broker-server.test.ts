import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { Socket } from 'node:net';
import request from 'supertest';
import type { Server as WSServer, WebSocket } from 'ws';

import type { TaskBrokerAuthController } from '@/task-runners/task-broker/auth/task-broker-auth.controller';
import type { TaskBrokerAuthService } from '@/task-runners/task-broker/auth/task-broker-auth.service';
import { TaskBrokerServer } from '@/task-runners/task-broker/task-broker-server';
import type { TaskBrokerServerInitRequest } from '@/task-runners/task-broker/task-broker-types';
import type { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';

describe('TaskBrokerServer', () => {
	const createServer = (overrides?: { authService?: TaskBrokerAuthService }) => {
		const authService = overrides?.authService ?? mock<TaskBrokerAuthService>();
		const taskBrokerWsServer = mock<TaskBrokerWsServer>();

		const server = new TaskBrokerServer(
			mock(),
			mock<GlobalConfig>({
				taskRunners: { path: '/runners', authToken: 'token' },
				endpoints: { health: '/health' },
				sentry: { backendDsn: '' },
			}),
			mock<TaskBrokerAuthController>(),
			taskBrokerWsServer,
			authService,
			mock(),
		);

		return { server, authService, taskBrokerWsServer };
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

		it('should return 401 when no Authorization header is provided', async () => {
			const { server } = createServer();
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
			const authService = mock<TaskBrokerAuthService>();
			authService.tryConsumeGrantToken.mockResolvedValue(false);

			const { server } = createServer({ authService });
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

			expect(authService.tryConsumeGrantToken).toHaveBeenCalledWith('invalid-token');
			expect(socket.write).toHaveBeenCalledWith('HTTP/1.1 403 Forbidden\r\n\r\n');
			expect(socket.destroy).toHaveBeenCalled();
		});

		it('should proceed with upgrade when grant token is valid', async () => {
			const authService = mock<TaskBrokerAuthService>();
			authService.tryConsumeGrantToken.mockResolvedValue(true);

			const { server, taskBrokerWsServer } = createServer({ authService });
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

			expect(authService.tryConsumeGrantToken).toHaveBeenCalledWith('valid-token');
			expect(wsServerMock.handleUpgrade).toHaveBeenCalled();
			expect(taskBrokerWsServer.add).toHaveBeenCalledWith('runner1', mockWs);
			expect(socket.destroy).not.toHaveBeenCalled();
		});
	});
});
