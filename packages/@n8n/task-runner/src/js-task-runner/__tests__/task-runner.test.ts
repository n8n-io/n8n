import type { Mock, MockInstance } from 'vitest';
import { WebSocket } from 'ws';

import { newTaskState } from '@/js-task-runner/__tests__/test-data';
import { TimeoutError } from '@/js-task-runner/errors/timeout-error';
import { TaskRunner, type TaskRunnerOpts } from '@/task-runner';
import type { TaskStatus } from '@/task-state';

class TestRunner extends TaskRunner {}

vi.mock('ws');

describe('TestRunner', () => {
	let runner: TestRunner;

	const newTestRunner = (opts: Partial<TaskRunnerOpts> = {}) =>
		new TestRunner({
			taskType: 'test-task',
			maxConcurrency: 5,
			idleTimeout: 60,
			grantToken: 'test-token',
			maxPayloadSize: 1024,
			taskBrokerUri: 'http://localhost:8080',
			timezone: 'America/New_York',
			taskTimeout: 60,
			gracefulShutdownTimeout: 30,
			shutdownForceKillMargin: 10,
			healthcheckServer: {
				enabled: false,
				host: 'localhost',
				port: 8081,
			},
			...opts,
		});

	afterEach(() => {
		runner?.clearIdleTimer();
	});

	describe('constructor', () => {
		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should correctly construct WebSocket URI with provided taskBrokerUri', () => {
			runner = newTestRunner({
				taskBrokerUri: 'http://localhost:8080',
			});

			expect(WebSocket).toHaveBeenCalledWith(
				`ws://localhost:8080/runners/_ws?id=${runner.id}`,
				expect.objectContaining({
					headers: {
						authorization: 'Bearer test-token',
					},
					maxPayload: 1024,
				}),
			);
		});

		it('should handle different taskBrokerUri formats correctly', () => {
			runner = newTestRunner({
				taskBrokerUri: 'https://example.com:3000/path',
			});

			expect(WebSocket).toHaveBeenCalledWith(
				`ws://example.com:3000/runners/_ws?id=${runner.id}`,
				expect.objectContaining({
					headers: {
						authorization: 'Bearer test-token',
					},
					maxPayload: 1024,
				}),
			);
		});

		it('should throw an error if taskBrokerUri is invalid', () => {
			expect(() =>
				newTestRunner({
					taskBrokerUri: 'not-a-valid-uri',
				}),
			).toThrowError(/Invalid URL/);
		});
	});

	describe('sendOffers', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.clearAllTimers();
			vi.useRealTimers();
		});

		it('should not send offers if canSendOffers is false', () => {
			runner = newTestRunner({
				taskType: 'test-task',
				maxConcurrency: 2,
			});
			const sendSpy = vi.spyOn(runner, 'send');
			expect(runner.canSendOffers).toBe(false);

			runner.sendOffers();

			expect(sendSpy).toHaveBeenCalledTimes(0);
		});

		it('should enable sending of offer on runnerregistered message', () => {
			runner = newTestRunner({
				taskType: 'test-task',
				maxConcurrency: 2,
			});
			runner.onMessage({
				type: 'broker:runnerregistered',
			});

			expect(runner.canSendOffers).toBe(true);
		});

		it('should send maxConcurrency offers when there are no offers', () => {
			runner = newTestRunner({
				taskType: 'test-task',
				maxConcurrency: 2,
			});
			runner.onMessage({
				type: 'broker:runnerregistered',
			});

			const sendSpy = vi.spyOn(runner, 'send');

			runner.sendOffers();
			runner.sendOffers();

			expect(sendSpy).toHaveBeenCalledTimes(2);
			expect(sendSpy.mock.calls).toEqual([
				[
					{
						type: 'runner:taskoffer',
						taskType: 'test-task',
						offerId: expect.any(String),
						validFor: expect.any(Number),
					},
				],
				[
					{
						type: 'runner:taskoffer',
						taskType: 'test-task',
						offerId: expect.any(String),
						validFor: expect.any(Number),
					},
				],
			]);
		});

		it('should send up to maxConcurrency offers when there is a running task', () => {
			runner = newTestRunner({
				taskType: 'test-task',
				maxConcurrency: 2,
			});
			runner.onMessage({
				type: 'broker:runnerregistered',
			});
			const taskState = newTaskState('test-task');
			runner.runningTasks.set('test-task', taskState);
			const sendSpy = vi.spyOn(runner, 'send');

			runner.sendOffers();

			expect(sendSpy).toHaveBeenCalledTimes(1);
			expect(sendSpy.mock.calls).toEqual([
				[
					{
						type: 'runner:taskoffer',
						taskType: 'test-task',
						offerId: expect.any(String),
						validFor: expect.any(Number),
					},
				],
			]);
			taskState.cleanup();
		});

		it('should delete stale offers and send new ones', () => {
			runner = newTestRunner({
				taskType: 'test-task',
				maxConcurrency: 2,
			});
			runner.onMessage({
				type: 'broker:runnerregistered',
			});

			const sendSpy = vi.spyOn(runner, 'send');

			runner.sendOffers();
			expect(sendSpy).toHaveBeenCalledTimes(2);
			sendSpy.mockClear();

			vi.advanceTimersByTime(6000);
			runner.sendOffers();
			expect(sendSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('taskCancelled', () => {
		test.each<[TaskStatus, string]>([
			['aborting:cancelled', 'cancelled'],
			['aborting:timeout', 'timeout'],
		])('should not do anything if task status is %s', async (status, reason) => {
			runner = newTestRunner();

			const taskId = 'test-task';
			const task = newTaskState(taskId);
			task.status = status;

			runner.runningTasks.set(taskId, task);

			await runner.taskCancelled(taskId, reason);

			expect(runner.runningTasks.size).toBe(1);
			expect(task.status).toBe(status);
		});

		it('should delete task if task is waiting for settings when task is cancelled', async () => {
			runner = newTestRunner();

			const taskId = 'test-task';
			const task = newTaskState(taskId);
			const taskCleanupSpy = vi.spyOn(task, 'cleanup');
			runner.runningTasks.set(taskId, task);

			await runner.taskCancelled(taskId, 'test-reason');

			expect(runner.runningTasks.size).toBe(0);
			expect(taskCleanupSpy).toHaveBeenCalled();
		});

		it('should reject pending requests when task is cancelled', async () => {
			runner = newTestRunner();

			const taskId = 'test-task';
			const task = newTaskState(taskId);
			task.status = 'running';
			runner.runningTasks.set(taskId, task);

			const dataRequestReject = vi.fn();
			const nodeTypesRequestReject = vi.fn();

			runner.dataRequests.set('data-req', {
				taskId,
				requestId: 'data-req',
				resolve: vi.fn(),
				reject: dataRequestReject,
			});

			runner.nodeTypesRequests.set('node-req', {
				taskId,
				requestId: 'node-req',
				resolve: vi.fn(),
				reject: nodeTypesRequestReject,
			});

			await runner.taskCancelled(taskId, 'test-reason');

			expect(dataRequestReject).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Task cancelled: test-reason',
				}),
			);

			expect(nodeTypesRequestReject).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Task cancelled: test-reason',
				}),
			);

			expect(runner.dataRequests.size).toBe(0);
			expect(runner.nodeTypesRequests.size).toBe(0);
		});
	});

	describe('taskTimedOut', () => {
		it('should error task if task is waiting for settings', async () => {
			runner = newTestRunner();

			const taskId = 'test-task';
			const task = newTaskState(taskId);
			task.status = 'waitingForSettings';
			runner.runningTasks.set(taskId, task);
			const sendSpy = vi.spyOn(runner, 'send');

			await runner.taskTimedOut(taskId);

			expect(runner.runningTasks.size).toBe(0);
			expect(sendSpy).toHaveBeenCalledWith({
				type: 'runner:taskerror',
				taskId,
				error: expect.any(TimeoutError),
			});
		});

		it('should reject pending requests when task is running', async () => {
			runner = newTestRunner();

			const taskId = 'test-task';
			const task = newTaskState(taskId);
			task.status = 'running';
			runner.runningTasks.set(taskId, task);

			const dataRequestReject = vi.fn();
			const nodeTypesRequestReject = vi.fn();

			runner.dataRequests.set('data-req', {
				taskId,
				requestId: 'data-req',
				resolve: vi.fn(),
				reject: dataRequestReject,
			});

			runner.nodeTypesRequests.set('node-req', {
				taskId,
				requestId: 'node-req',
				resolve: vi.fn(),
				reject: nodeTypesRequestReject,
			});

			await runner.taskCancelled(taskId, 'test-reason');

			expect(dataRequestReject).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Task cancelled: test-reason',
				}),
			);

			expect(nodeTypesRequestReject).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Task cancelled: test-reason',
				}),
			);

			expect(runner.dataRequests.size).toBe(0);
			expect(runner.nodeTypesRequests.size).toBe(0);
		});
	});

	describe('offerAccepted during shutdown', () => {
		it('should reject task offer once the runner has committed to draining', () => {
			runner = newTestRunner({ maxConcurrency: 2 });
			runner.onMessage({ type: 'broker:runnerregistered' });

			runner.sendOffers();
			const offerId = [...runner.openOffers.keys()][0];

			void runner.stop();
			// Broker signals it is draining -> the runner commits to draining.
			runner.onMessage({ type: 'broker:drain' });

			const sendSpy = vi.spyOn(runner, 'send');

			runner.offerAccepted(offerId, 'task-1');

			expect(sendSpy).toHaveBeenCalledWith({
				type: 'runner:taskrejected',
				taskId: 'task-1',
				reason: 'Runner is shutting down',
			});
			expect(runner.runningTasks.size).toBe(0);
		});

		it('should still accept a task during the grace period before the broker drains', () => {
			runner = newTestRunner({ maxConcurrency: 2, gracefulShutdownTimeout: 30 });
			runner.onMessage({ type: 'broker:runnerregistered' });

			runner.sendOffers();
			const offerId = [...runner.openOffers.keys()][0];

			// During the grace window (shutdown begun, broker not yet draining) tasks are accepted.
			void runner.stop();

			const sendSpy = vi.spyOn(runner, 'send');

			runner.offerAccepted(offerId, 'task-1');

			expect(sendSpy).toHaveBeenCalledWith({ type: 'runner:taskaccepted', taskId: 'task-1' });
			expect(runner.runningTasks.size).toBe(1);
		});

		it('should clear open offers promptly on stop when the grace period is disabled', async () => {
			runner = newTestRunner({ maxConcurrency: 2, gracefulShutdownTimeout: 0 });
			runner.onMessage({ type: 'broker:runnerregistered' });

			runner.sendOffers();
			expect(runner.openOffers.size).toBeGreaterThan(0);

			void runner.stop();
			await Promise.resolve();

			expect(runner.openOffers.size).toBe(0);
		});
	});

	describe('drain', () => {
		it('should stop sending offers on drain message', () => {
			runner = newTestRunner();
			runner.onMessage({ type: 'broker:runnerregistered' });
			expect(runner.canSendOffers).toBe(true);

			runner.onMessage({ type: 'broker:drain' });

			expect(runner.canSendOffers).toBe(false);
		});

		it('should keep offering after stop() until the broker drains', async () => {
			vi.useRealTimers();
			runner = newTestRunner({ maxConcurrency: 2, gracefulShutdownTimeout: 30 });
			runner.onMessage({ type: 'broker:runnerregistered' });
			runner.sendOffers();
			expect(runner.openOffers.size).toBeGreaterThan(0);

			void runner.stop();
			await Promise.resolve();

			// Still offering during the grace window, before the broker drains.
			expect(runner.canSendOffers).toBe(true);
			expect(runner.openOffers.size).toBeGreaterThan(0);

			// Once the broker signals it is draining, the runner stops offering and
			// clears its open offers.
			runner.onMessage({ type: 'broker:drain' });
			expect(runner.canSendOffers).toBe(false);
			await new Promise((resolve) => setImmediate(resolve));
			expect(runner.openOffers.size).toBe(0);
		});

		it('should commit to draining once the grace period elapses without a broker:drain', async () => {
			vi.useFakeTimers();
			try {
				runner = newTestRunner({ maxConcurrency: 2, gracefulShutdownTimeout: 30 });
				runner.onMessage({ type: 'broker:runnerregistered' });
				runner.sendOffers();
				expect(runner.openOffers.size).toBeGreaterThan(0);

				void runner.stop();
				await Promise.resolve();

				// During the grace period the runner keeps offering, even though no
				// broker:drain ever arrives (e.g. only the runner is being restarted).
				expect(runner.canSendOffers).toBe(true);

				// When the grace period elapses the runner commits to draining anyway, so
				// it can never hang waiting for a drain message that will not come.
				await vi.advanceTimersByTimeAsync(30_000);
				expect(runner.canSendOffers).toBe(false);
				expect(runner.openOffers.size).toBe(0);
			} finally {
				vi.useRealTimers();
			}
		});

		it('should wait for an in-flight task before closing the connection', async () => {
			vi.useFakeTimers();
			try {
				runner = newTestRunner({ maxConcurrency: 2, gracefulShutdownTimeout: 30 });
				runner.onMessage({ type: 'broker:runnerregistered' });
				const closeSpy = vi.spyOn(runner.ws, 'close');

				// A task is running when shutdown begins.
				runner.runningTasks.set('task-1', newTaskState('task-1'));

				void runner.stop();
				runner.onMessage({ type: 'broker:drain' });
				await vi.advanceTimersByTimeAsync(500);

				// The runner must not close while the task is still running.
				expect(closeSpy).not.toHaveBeenCalled();

				// Once the task finishes, the runner closes the connection.
				runner.runningTasks.delete('task-1');
				await vi.advanceTimersByTimeAsync(200);
				expect(closeSpy).toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it('should abandon an unfinished task after the grace period but still close the connection', async () => {
			vi.useFakeTimers();
			try {
				runner = newTestRunner({ gracefulShutdownTimeout: 1 });
				runner.onMessage({ type: 'broker:runnerregistered' });
				const closeSpy = vi.spyOn(runner.ws, 'close');

				// A task that never finishes.
				runner.runningTasks.set('task-1', newTaskState('task-1'));

				void runner.stop();
				runner.onMessage({ type: 'broker:drain' }); // skip the keep-offering wait

				// Once the grace period elapses the task is abandoned (the broker will fail
				// it), but the runner still closes the connection cleanly rather than hang.
				await vi.advanceTimersByTimeAsync(1500);
				expect(closeSpy).toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it('should commit to draining immediately when deferToBrokerDrain is false', async () => {
			runner = newTestRunner({ gracefulShutdownTimeout: 30 });
			runner.onMessage({ type: 'broker:runnerregistered' });
			runner.sendOffers();
			expect(runner.openOffers.size).toBeGreaterThan(0);

			// The idle-timeout exit drains immediately: no execution is waiting on this
			// runner, so it should not keep offering for the grace period.
			void runner.stop({ deferToBrokerDrain: false });
			await new Promise((resolve) => setImmediate(resolve));

			expect(runner.canSendOffers).toBe(false);
			expect(runner.openOffers.size).toBe(0);
		});
	});

	describe('connection close', () => {
		let processExitSpy: MockInstance;

		beforeEach(() => {
			processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
		});

		afterEach(() => {
			processExitSpy.mockRestore();
		});

		it('should exit cleanly when the connection closes after the broker drained it', () => {
			runner = newTestRunner();
			runner.onMessage({ type: 'broker:runnerregistered' });
			// Broker signalled drain (broker:drain) but the runner never got its own
			// SIGTERM (e.g. a runner launched to serve a task during instance shutdown).
			runner.onMessage({ type: 'broker:drain' });

			const closeHandler = (runner.ws.addEventListener as unknown as Mock).mock.calls.find(
				([event]: unknown[]) => event === 'close',
			)?.[1] as () => void;
			closeHandler();

			expect(processExitSpy).toHaveBeenCalledWith(0);
		});

		it('should exit process on unexpected close', () => {
			runner = newTestRunner();

			// Get the close handler that was registered
			const closeHandler = (runner.ws.addEventListener as unknown as Mock).mock.calls.find(
				([event]: unknown[]) => event === 'close',
			)?.[1] as () => void;
			expect(closeHandler).toBeDefined();

			closeHandler();

			expect(processExitSpy).toHaveBeenCalledWith(1);
		});

		it('should not exit process during graceful stop', () => {
			runner = newTestRunner();

			// Get the close handler registered via addEventListener in constructor
			const closeHandler = (runner.ws.addEventListener as unknown as Mock).mock.calls.find(
				([event]: unknown[]) => event === 'close',
			)?.[1] as () => void;
			expect(closeHandler).toBeDefined();

			// Calling stop() sets isShuttingDown = true. We call it but don't
			// await because the mocked ws can't complete the close handshake.
			void runner.stop();

			// Simulate the close event after stop() has set isShuttingDown
			closeHandler();

			expect(processExitSpy).not.toHaveBeenCalled();
		});

		it('should release the grace-period wait when the connection closes during shutdown', async () => {
			runner = newTestRunner({ gracefulShutdownTimeout: 30 });
			runner.onMessage({ type: 'broker:runnerregistered' });
			runner.sendOffers();
			expect(runner.openOffers.size).toBeGreaterThan(0);

			const closeHandler = (runner.ws.addEventListener as unknown as Mock).mock.calls.find(
				([event]: unknown[]) => event === 'close',
			)?.[1] as () => void;

			void runner.stop();
			await Promise.resolve();
			expect(runner.canSendOffers).toBe(true); // still in the grace wait

			// The broker connection drops without sending broker:drain. The runner must
			// not block for the full grace period waiting for a drain that cannot arrive.
			closeHandler();
			await new Promise((resolve) => setImmediate(resolve));
			expect(runner.canSendOffers).toBe(false);
			expect(runner.openOffers.size).toBe(0);
		});
	});
});
