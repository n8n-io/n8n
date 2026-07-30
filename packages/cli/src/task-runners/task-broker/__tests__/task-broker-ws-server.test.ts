import type { GlobalConfig, TaskRunnersConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';
import type WebSocket from 'ws';

import { WsStatusCodes } from '@/constants';
import type { DefaultTaskRunnerDisconnectAnalyzer } from '@/task-runners/default-task-runner-disconnect-analyzer';
import { TaskBrokerWsServer } from '@/task-runners/task-broker/task-broker-ws-server';
import type { TaskBroker } from '@/task-runners/task-broker/task-broker.service';

const globalConfig = mock<GlobalConfig>({ generic: { gracefulShutdownTimeout: 30 } });

const WS_OPEN = 1;

const setReadyState = (ws: WebSocket, readyState: number) => {
	(ws as unknown as { readyState: number }).readyState = readyState;
};

const mockWs = (readyState = WS_OPEN, isAlive = true) => {
	const ws = mock<WebSocket>({ OPEN: WS_OPEN });
	setReadyState(ws, readyState);
	ws.isAlive = isAlive;
	return ws;
};

const createServer = ({
	taskBroker = mock<TaskBroker>(),
	disconnectAnalyzer = mock<DefaultTaskRunnerDisconnectAnalyzer>(),
	heartbeatInterval = 30,
}: {
	taskBroker?: TaskBroker;
	disconnectAnalyzer?: DefaultTaskRunnerDisconnectAnalyzer;
	heartbeatInterval?: number;
} = {}) =>
	new TaskBrokerWsServer(
		mock(),
		taskBroker,
		disconnectAnalyzer,
		mock<TaskRunnersConfig>({ path: '/runners', heartbeatInterval }),
		mock(),
		globalConfig,
	);

describe('TaskBrokerWsServer', () => {
	describe('removeConnection', () => {
		it('should close with 1000 status code by default', async () => {
			const server = createServer();
			const ws = mockWs();
			server.runnerConnections.set('test-runner', ws);

			await server.removeConnection('test-runner');

			expect(ws.close).toHaveBeenCalledWith(WsStatusCodes.CloseNormal);
		});

		it('should ignore stale close events from replaced connections', async () => {
			const taskBroker = mock<TaskBroker>();
			const server = createServer({ taskBroker });
			const staleWs = mockWs();
			const currentWs = mockWs();
			server.runnerConnections.set('test-runner', currentWs);

			await server.removeConnection('test-runner', 'unknown', WsStatusCodes.CloseNormal, staleWs);

			expect(currentWs.close).not.toHaveBeenCalled();
			expect(taskBroker.deregisterRunner).not.toHaveBeenCalled();
			expect(server.runnerConnections.get('test-runner')).toBe(currentWs);
		});
	});

	describe('heartbeat timer', () => {
		const DEAD = false;

		const runHeartbeatCheck = async (...connections: WebSocket[]) => {
			vi.useFakeTimers();
			const server = createServer();

			connections.forEach((ws, i) => server.runnerConnections.set(`runner-${i}`, ws));

			server.start();
			vi.advanceTimersByTime(30 * Time.seconds.toMilliseconds);
			await Promise.resolve();

			// Restoring real timers discards the heartbeat interval, so the server needs no stop.
			vi.useRealTimers();
		};

		it('should set up heartbeat timer on server start', async () => {
			const setIntervalSpy = vi.spyOn(global, 'setInterval');
			const server = createServer();

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
			const server = createServer();
			server.start();

			await server.stop();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});

		it('should close connection with protocol error code when heartbeat check fails', async () => {
			const ws = mockWs(WS_OPEN, DEAD);

			await runHeartbeatCheck(ws);

			expect(ws.close).toHaveBeenCalledWith(WsStatusCodes.CloseProtocolError);
		});
	});

	describe('sendMessage', () => {
		it('should work with a message containing circular references', () => {
			const server = createServer();
			const ws = mockWs();
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
