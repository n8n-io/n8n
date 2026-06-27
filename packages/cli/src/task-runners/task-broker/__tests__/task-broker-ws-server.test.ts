import type { GlobalConfig, TaskRunnersConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { mock } from 'jest-mock-extended';
import type WebSocket from 'ws';

import { WsStatusCodes } from '@/constants';
import { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';
import { TaskRunnerLifecycleEvents } from '@/task-runners/task-runner-lifecycle-events';

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
	});

	describe('heartbeat timer', () => {
		it('should set up heartbeat timer on server start', async () => {
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

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
			jest.spyOn(global, 'setInterval');
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

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
			jest.useFakeTimers();
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

			jest.advanceTimersByTime(30 * Time.seconds.toMilliseconds);

			await Promise.resolve();

			expect(ws.close).toHaveBeenCalledWith(WsStatusCodes.CloseProtocolError);

			await server.stop();
			jest.useRealTimers();
		});
	});

	describe('runner:unresponsive event', () => {
		it('should disconnect the named runner when the broker emits `runner:unresponsive`', async () => {
			const lifecycleEvents = new TaskRunnerLifecycleEvents();
			const server = new TaskBrokerWsServer(
				mock(),
				mock(),
				mock(),
				mock<TaskRunnersConfig>({ path: '/runners', heartbeatInterval: 30 }),
				lifecycleEvents,
				globalConfig,
			);

			const ws = mock<WebSocket>();
			server.runnerConnections.set('stuck-runner', ws);

			server.start();

			lifecycleEvents.emit('runner:unresponsive', { runnerId: 'stuck-runner' });

			// `removeConnection` is async via the `void this.removeConnection(...)` call
			// inside the listener — flush microtasks before asserting.
			await Promise.resolve();
			await Promise.resolve();

			expect(ws.close).toHaveBeenCalledWith(WsStatusCodes.CloseProtocolError);

			await server.stop();
		});

		it('should not disconnect other runners when one is reported unresponsive', async () => {
			const lifecycleEvents = new TaskRunnerLifecycleEvents();
			const server = new TaskBrokerWsServer(
				mock(),
				mock(),
				mock(),
				mock<TaskRunnersConfig>({ path: '/runners', heartbeatInterval: 30 }),
				lifecycleEvents,
				globalConfig,
			);

			const stuckWs = mock<WebSocket>();
			const healthyWs = mock<WebSocket>();
			server.runnerConnections.set('stuck-runner', stuckWs);
			server.runnerConnections.set('healthy-runner', healthyWs);

			server.start();

			lifecycleEvents.emit('runner:unresponsive', { runnerId: 'stuck-runner' });
			await Promise.resolve();
			await Promise.resolve();

			expect(stuckWs.close).toHaveBeenCalled();
			expect(healthyWs.close).not.toHaveBeenCalled();

			await server.stop();
		});

		it('should unsubscribe on stop so events after stop do not disconnect runners', async () => {
			const lifecycleEvents = new TaskRunnerLifecycleEvents();
			const server = new TaskBrokerWsServer(
				mock(),
				mock(),
				mock(),
				mock<TaskRunnersConfig>({ path: '/runners', heartbeatInterval: 30 }),
				lifecycleEvents,
				globalConfig,
			);

			const ws = mock<WebSocket>();
			server.runnerConnections.set('runner-1', ws);

			server.start();
			await server.stop();

			lifecycleEvents.emit('runner:unresponsive', { runnerId: 'runner-1' });
			await Promise.resolve();
			await Promise.resolve();

			// `stop()` itself drains runners via `stopConnectedRunners` — so we
			// expect close to have been called from the drain, but NOT a second
			// time from a stale `runner:unresponsive` listener.
			expect(ws.close).toHaveBeenCalledTimes(1);
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
