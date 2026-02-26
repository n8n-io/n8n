import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import { ServerResponse } from 'node:http';
import request from 'supertest';
import type WebSocket from 'ws';

import type { TaskBrokerAuthController } from '@/task-runners/task-broker/auth/task-broker-auth.controller';
import { TaskBrokerServer } from '@/task-runners/task-broker/task-broker-server';
import type { TaskBrokerServerInitRequest } from '@/task-runners/task-broker/task-broker-types';

describe('TaskBrokerServer', () => {
	describe('GET /healthz', () => {
		it('should return 200 regardless of N8N_ENDPOINT_HEALTH', async () => {
			// Simulate the case where N8N_ENDPOINT_HEALTH is set to 'health'
			// (required on platforms like Cloud Run that reserve /healthz).
			// The task broker is internal and must always expose /healthz so
			// that the task-runner-launcher can reach it.
			const server = new TaskBrokerServer(
				mock(),
				mock<GlobalConfig>({
					taskRunners: { path: '/runners', authToken: 'token' },
					endpoints: { health: '/health' },
					sentry: { backendDsn: '' },
				}),
				mock<TaskBrokerAuthController>(),
				mock(),
			);

			// @ts-expect-error Private method
			server.setupCommonMiddlewares();
			// @ts-expect-error Private method
			server.configureRoutes();

			await request(server.app).get('/healthz').expect(200, { status: 'ok' });
		});
	});

	describe('handleUpgradeRequest', () => {
		it('should close WebSocket when response status code is > 200', () => {
			const ws = mock<WebSocket>();
			const request = mock<TaskBrokerServerInitRequest>({
				url: '/runners/_ws',
				ws,
			});

			const server = new TaskBrokerServer(
				mock(),
				mock<GlobalConfig>({ taskRunners: { path: '/runners' } }),
				mock<TaskBrokerAuthController>(),
				mock(),
			);

			// @ts-expect-error Private property
			server.handleUpgradeRequest(request, mock(), Buffer.from(''));

			const response = new ServerResponse(request);
			response.writeHead = (statusCode) => {
				if (statusCode > 200) ws.close();
				return response;
			};

			response.writeHead(401);
			expect(ws.close).toHaveBeenCalledWith(); // no args
		});

		it('should not close WebSocket when response status code is 200', () => {
			const ws = mock<WebSocket>();
			const request = mock<TaskBrokerServerInitRequest>({
				url: '/runners/_ws',
				ws,
			});

			const server = new TaskBrokerServer(
				mock(),
				mock<GlobalConfig>({ taskRunners: { path: '/runners' } }),
				mock<TaskBrokerAuthController>(),
				mock(),
			);

			// @ts-expect-error Private property
			server.handleUpgradeRequest(request, mock(), Buffer.from(''));

			const response = new ServerResponse(request);
			response.writeHead = (statusCode) => {
				if (statusCode > 200) ws.close();
				return response;
			};

			response.writeHead(200);
			expect(ws.close).not.toHaveBeenCalled();
		});
	});
});
