import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import { ServerResponse } from 'node:http';
import type WebSocket from 'ws';

import type { TaskBrokerAuthController } from '@/task-runners/task-broker/auth/task-broker-auth.controller';
import { TaskBrokerServer } from '@/task-runners/task-broker/task-broker-server';
import type { TaskBrokerServerInitRequest } from '@/task-runners/task-broker/task-broker-types';

describe('TaskBrokerServer', () => {
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
