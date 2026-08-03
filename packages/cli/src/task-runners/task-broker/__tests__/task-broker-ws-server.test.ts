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
const WS_CLOSING = 2;

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

const wsMessage = (message: unknown) => Buffer.from(JSON.stringify(message));

const messageHandlerOf = (ws: WebSocket) => {
	// `on` is overloaded, so its mock calls are unreachable through the ws types
	const onCalls = (ws.on as unknown as { mock: { calls: Array<[string, unknown]> } }).mock.calls;
	return onCalls.find(([event]) => event === 'message')?.[1] as (
		data: WebSocket.RawData,
	) => Promise<void>;
};

const registerOverWs = async (server: TaskBrokerWsServer, id: string, ws: WebSocket) => {
	server.add(id, ws);

	const onMessage = messageHandlerOf(ws);
	await onMessage(
		wsMessage({ type: 'runner:info', name: 'JS Task Runner', types: ['javascript'] }),
	);

	return onMessage;
};

const pendingAnalysis = () => {
	let complete: (error: Error) => void = () => {};
	const disconnectAnalyzer = mock<DefaultTaskRunnerDisconnectAnalyzer>();
	disconnectAnalyzer.toDisconnectError.mockReturnValue(
		new Promise<Error>((resolve) => {
			complete = resolve;
		}),
	);
	return { disconnectAnalyzer, complete: (error: Error) => complete(error) };
};

describe('TaskBrokerWsServer', () => {
	describe('removeConnection', () => {
		it('should close with 1000 status code by default', async () => {
			const server = createServer();
			const ws = mockWs();
			server.runnerConnections.set('test-runner', ws);

			await server.removeConnection('test-runner');

			expect(ws.close).toHaveBeenCalledWith(WsStatusCodes.CloseNormal);
		});

		it('should stop routing to the runner before the disconnect analysis completes', async () => {
			const { disconnectAnalyzer, complete } = pendingAnalysis();
			const taskBroker = mock<TaskBroker>();
			const server = createServer({ taskBroker, disconnectAnalyzer });
			const ws = mockWs();
			server.runnerConnections.set('test-runner', ws);

			const removal = server.removeConnection('test-runner');
			await Promise.resolve();

			expect(server.runnerConnections.has('test-runner')).toBe(false);
			expect(ws.close).toHaveBeenCalled();
			expect(taskBroker.deregisterRunner).not.toHaveBeenCalled();

			complete(new Error('disconnected'));
			await removal;

			expect(taskBroker.deregisterRunner).toHaveBeenCalled();
		});

		it('should not deregister a runner that reconnects before disconnect analysis completes', async () => {
			const { disconnectAnalyzer, complete } = pendingAnalysis();
			const taskBroker = mock<TaskBroker>();
			const server = createServer({ taskBroker, disconnectAnalyzer });
			const newWs = mockWs();
			server.runnerConnections.set('test-runner', mockWs());

			const removal = server.removeConnection('test-runner');
			await Promise.resolve();

			server.runnerConnections.set('test-runner', newWs);
			complete(new Error('disconnected'));
			await removal;

			expect(taskBroker.deregisterRunner).not.toHaveBeenCalled();
			expect(server.runnerConnections.get('test-runner')).toBe(newWs);
		});

		it('should fail the tasks in flight on the replaced connection when the runner reconnects', async () => {
			const { disconnectAnalyzer, complete } = pendingAnalysis();
			const taskBroker = mock<TaskBroker>();
			taskBroker.getInFlightTaskIds.mockReturnValue(['task1', 'task2']);
			const server = createServer({ taskBroker, disconnectAnalyzer });
			server.runnerConnections.set('test-runner', mockWs());

			const removal = server.removeConnection('test-runner');
			await Promise.resolve();

			server.runnerConnections.set('test-runner', mockWs());
			const disconnectError = new Error('disconnected');
			complete(disconnectError);
			await removal;

			expect(taskBroker.deregisterRunner).not.toHaveBeenCalled();
			expect(taskBroker.failTasks).toHaveBeenCalledWith(['task1', 'task2'], disconnectError);
		});

		it('should ignore stale close events from replaced connections', async () => {
			const taskBroker = mock<TaskBroker>();
			const server = createServer({ taskBroker });
			const staleWs = mockWs();
			const currentWs = mockWs();
			server.runnerConnections.set('test-runner', currentWs);

			await server.removeConnection('test-runner', { expectedConnection: staleWs });

			expect(currentWs.close).not.toHaveBeenCalled();
			expect(taskBroker.deregisterRunner).not.toHaveBeenCalled();
			expect(server.runnerConnections.get('test-runner')).toBe(currentWs);
		});
	});

	describe('runner reachability', () => {
		const registerAndGetReachability = async (ws: WebSocket) => {
			const taskBroker = mock<TaskBroker>();
			const server = createServer({ taskBroker });

			await registerOverWs(server, 'test-runner', ws);

			return { server, isRunnerReachable: taskBroker.registerRunner.mock.calls[0][2]! };
		};

		it('should report the runner as unreachable once its connection stops being open', async () => {
			const ws = mockWs();
			const { isRunnerReachable } = await registerAndGetReachability(ws);

			expect(isRunnerReachable()).toBe(true);

			setReadyState(ws, WS_CLOSING);

			expect(isRunnerReachable()).toBe(false);
		});

		it('should report the runner as unreachable once its connection is replaced', async () => {
			const { server, isRunnerReachable } = await registerAndGetReachability(mockWs());

			server.runnerConnections.set('test-runner', mockWs());

			expect(isRunnerReachable()).toBe(false);
		});
	});

	describe('incoming runner messages', () => {
		const offer = {
			type: 'runner:taskoffer',
			offerId: 'offer1',
			taskType: 'javascript',
			validFor: 5000,
		};

		it('should forward a message from the connection the runner is registered with', async () => {
			const taskBroker = mock<TaskBroker>();
			const server = createServer({ taskBroker });

			const onMessage = await registerOverWs(server, 'test-runner', mockWs());
			await onMessage(wsMessage(offer));

			expect(taskBroker.onRunnerMessage).toHaveBeenCalledWith('test-runner', offer);
		});

		it('should drop a message buffered on a connection that was replaced', async () => {
			const taskBroker = mock<TaskBroker>();
			const server = createServer({ taskBroker });

			const onStaleMessage = await registerOverWs(server, 'test-runner', mockWs());
			await registerOverWs(server, 'test-runner', mockWs());

			await onStaleMessage(wsMessage(offer));

			expect(taskBroker.onRunnerMessage).not.toHaveBeenCalled();
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

		it('should close every dead connection in a single check', async () => {
			const deadWs1 = mockWs(WS_OPEN, DEAD);
			const deadWs2 = mockWs(WS_OPEN, DEAD);

			await runHeartbeatCheck(deadWs1, deadWs2);

			expect(deadWs1.close).toHaveBeenCalledWith(WsStatusCodes.CloseProtocolError);
			expect(deadWs2.close).toHaveBeenCalledWith(WsStatusCodes.CloseProtocolError);
		});

		it('should keep pinging live connections listed after a dead one', async () => {
			const liveWs = mockWs();

			await runHeartbeatCheck(mockWs(WS_OPEN, DEAD), liveWs);

			expect(liveWs.ping).toHaveBeenCalled();
			expect(liveWs.isAlive).toBe(false);
			expect(liveWs.close).not.toHaveBeenCalled();
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
