import { WebSocket } from 'ws';

import { newTaskState } from '@/js-task-runner/__tests__/test-data';
import { TimeoutError } from '@/js-task-runner/errors/timeout-error';
import { TaskRunner, type TaskRunnerOpts } from '@/task-runner';
import type { TaskStatus } from '@/task-state';

class TestRunner extends TaskRunner {}

jest.mock('ws');

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
			jest.clearAllMocks();
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
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.clearAllTimers();
		});

		it('should not send offers if canSendOffers is false', () => {
			runner = newTestRunner({
				taskType: 'test-task',
				maxConcurrency: 2,
			});
			const sendSpy = jest.spyOn(runner, 'send');
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

			const sendSpy = jest.spyOn(runner, 'send');

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
			const sendSpy = jest.spyOn(runner, 'send');

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

			const sendSpy = jest.spyOn(runner, 'send');

			runner.sendOffers();
			expect(sendSpy).toHaveBeenCalledTimes(2);
			sendSpy.mockClear();

			jest.advanceTimersByTime(6000);
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
			const taskCleanupSpy = jest.spyOn(task, 'cleanup');
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

			const dataRequestReject = jest.fn();
			const nodeTypesRequestReject = jest.fn();

			runner.dataRequests.set('data-req', {
				taskId,
				requestId: 'data-req',
				resolve: jest.fn(),
				reject: dataRequestReject,
			});

			runner.nodeTypesRequests.set('node-req', {
				taskId,
				requestId: 'node-req',
				resolve: jest.fn(),
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
			const sendSpy = jest.spyOn(runner, 'send');

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

			const dataRequestReject = jest.fn();
			const nodeTypesRequestReject = jest.fn();

			runner.dataRequests.set('data-req', {
				taskId,
				requestId: 'data-req',
				resolve: jest.fn(),
				reject: dataRequestReject,
			});

			runner.nodeTypesRequests.set('node-req', {
				taskId,
				requestId: 'node-req',
				resolve: jest.fn(),
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
});
