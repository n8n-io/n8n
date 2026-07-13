import type { GlobalConfig, TaskRunnersConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';
import type WebSocket from 'ws';

import { WsStatusCodes } from '@/constants';
import { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';

const globalConfig = mock<GlobalConfig>({ generic: { gracefulShutdownTimeout: 30 } });

describe('TaskBrokerWsServer', () => {
	describe('removeConnection', () => {
		it('should close with 1000 status code by default', async () => {
			const server = new TaskBrokerWsServer(mock(), mock(), mock(), mock(), mock(), globalConfig);
			const ws = mock<WebSocket>();
			server.runnerConnections.set('test-runner', ws);

			await server.removeConnection('test-runner');

			expect(ws.close).toHaveBeenCalledWith(WsStatusCodes.CloseNormal);
		});

		it('should close and delete if connectionToRemove matches active connection', async () => {
			const server = new TaskBrokerWsServer(mock(), mock(), mock(), mock(), mock(), globalConfig);
			const ws = mock<WebSocket>();
			server.runnerConnections.set('test-runner', ws);

			await server.removeConnection('test-runner', 'unknown', WsStatusCodes.CloseNormal, ws);

			expect(ws.close).toHaveBeenCalledWith(WsStatusCodes.CloseNormal);
			expect(server.runnerConnections.has('test-runner')).toBe(false);
		});

		it('should not close or delete if connectionToRemove does not match active connection', async () => {
			const server = new TaskBrokerWsServer(mock(), mock(), mock(), mock(), mock(), globalConfig);
			const wsActive = mock<WebSocket>();
			const wsOld = mock<WebSocket>();
			server.runnerConnections.set('test-runner', wsActive);

			await server.removeConnection('test-runner', 'unknown', WsStatusCodes.CloseNormal, wsOld);

			expect(wsOld.close).not.toHaveBeenCalled();
			expect(wsActive.close).not.toHaveBeenCalled();
			expect(server.runnerConnections.get('test-runner')).toBe(wsActive);
		});
	});

	describe('heartbeat timer', () => {
		it('should set up heartbeat timer on server start', async () => {
			const setIntervalSpy = vi.spyOn(global, 'setInterval');

			const server = new TaskBrokerWsServer(
				mock(),
				mock(),
				mock(),
				mock<TaskRunnersConfig>({ path: '/runners', heartbeatInterval: 30 }),
				mock(),
				globalConfig,
			);

			server.start();

			expect(setIntervalSpy).toHaveBeenCalledWith(
				expect.any(Function),
				30 * Time.seconds.toMilliseconds,
			);

			await server.stop();
		});

		it('should clear heartbeat timer on server stop', async () => {
			vi.spyOn(global, 'setInterval');
			const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

			const server = new TaskBrokerWsServer(
				mock(),
				mock(),
				mock(),
				mock<TaskRunnersConfig>({ path: '/runners', heartbeatInterval: 30 }),
				mock(),
				globalConfig,
			);
			server.start();

			await server.stop();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});

		it('should close connection with protocol error code when heartbeat check fails', async () => {
			vi.useFakeTimers();
			const server = new TaskBrokerWsServer(
				mock(),
				mock(),
				mock(),
				mock<TaskRunnersConfig>({ path: '/runners', heartbeatInterval: 30 }),
				mock(),
				globalConfig,
			);

			const ws = mock<WebSocket>();
			ws.isAlive = false;
			server.runnerConnections.set('test-runner', ws);

			server.start();

			vi.advanceTimersByTime(30 * Time.seconds.toMilliseconds);

			await Promise.resolve();

			expect(ws.close).toHaveBeenCalledWith(WsStatusCodes.CloseProtocolError);

			await server.stop();
			vi.useRealTimers();
		});

		it('should continue checking remaining connections even if one fails the heartbeat check', async () => {
			vi.useFakeTimers();
			const server = new TaskBrokerWsServer(
				mock(),
				mock(),
				mock(),
				mock<TaskRunnersConfig>({ path: '/runners', heartbeatInterval: 30 }),
				mock(),
				globalConfig,
			);

			const ws1 = mock<WebSocket>();
			ws1.isAlive = false;
			const ws2 = mock<WebSocket>();
			ws2.isAlive = true;

			server.runnerConnections.set('runner1', ws1);
			server.runnerConnections.set('runner2', ws2);

			server.start();

			vi.advanceTimersByTime(30 * Time.seconds.toMilliseconds);

			await Promise.resolve();

			// ws1 should be closed due to failed heartbeat
			expect(ws1.close).toHaveBeenCalledWith(WsStatusCodes.CloseProtocolError);
			// ws2 should be pinged and set to isAlive = false
			expect(ws2.ping).toHaveBeenCalled();
			expect(ws2.isAlive).toBe(false);

			await server.stop();
			vi.useRealTimers();
		});
	});

	describe('sendMessage', () => {
		it('should work with a message containing circular references', () => {
			const server = new TaskBrokerWsServer(mock(), mock(), mock(), mock(), mock(), globalConfig);
			const ws = mock<WebSocket>();
			server.runnerConnections.set('test-runner', ws);

			const messageData: Record<string, unknown> = {};
			messageData.circular = messageData;

			expect(() =>
				server.sendMessage('test-runner', {
					type: 'broker:taskdataresponse',
					taskId: 'taskId',
					requestId: 'requestId',
					data: messageData,
				}),
			).not.toThrow();

			expect(ws.send).toHaveBeenCalledWith(
				'{"type":"broker:taskdataresponse","taskId":"taskId","requestId":"requestId","data":{"circular":"[Circular Reference]"}}',
			);
		});
	});
});
