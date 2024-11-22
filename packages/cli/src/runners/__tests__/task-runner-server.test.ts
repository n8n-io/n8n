import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import { ServerResponse } from 'node:http';
import type WebSocket from 'ws';

import type { TaskRunnerAuthController } from '@/runners/auth/task-runner-auth.controller';
import { TaskRunnerServer } from '@/runners/task-runner-server';

import type { TaskRunnerServerInitRequest } from '../runner-types';

describe('TaskRunnerServer', () => {
	describe('health endpoint', () => {
		it('should send 200 status code', async () => {
			const server = new TaskRunnerServer(
				mock(),
				mock<GlobalConfig>({ taskRunners: { path: '/runners' } }),
				mock(),
				mock(),
			);

			const mockResponse = { sendStatus: jest.fn() };

			// @ts-expect-error Test
			server.app = {
				get: jest.fn().mockImplementation((path, handler) => {
					if (path === '/runners/healthz') {
						handler({}, mockResponse);
					}
				}),
				post: jest.fn(),
				stop: jest.fn().mockResolvedValue(undefined),
				disable: jest.fn(),
				use: jest.fn(),
			};

			await server.start();

			expect(mockResponse.sendStatus).toHaveBeenCalledWith(200);

			await server.stop(); // allow Jest to exit cleanly
		});
	});

	describe('handleUpgradeRequest', () => {
		it('should close WebSocket when response status code is > 200', () => {
			const ws = mock<WebSocket>();
			const request = mock<TaskRunnerServerInitRequest>({
				url: '/runners/_ws',
				ws,
			});

			const server = new TaskRunnerServer(
				mock(),
				mock<GlobalConfig>({ taskRunners: { path: '/runners' } }),
				mock<TaskRunnerAuthController>(),
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
			const request = mock<TaskRunnerServerInitRequest>({
				url: '/runners/_ws',
				ws,
			});

			const server = new TaskRunnerServer(
				mock(),
				mock<GlobalConfig>({ taskRunners: { path: '/runners' } }),
				mock<TaskRunnerAuthController>(),
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
