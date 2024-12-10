import { WebSocket } from 'ws';

import { TaskRunner } from '@/task-runner';

class TestRunner extends TaskRunner {}

jest.mock('ws');

describe('TestRunner', () => {
	describe('constructor', () => {
		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should correctly construct WebSocket URI with provided taskBrokerUri', () => {
			const runner = new TestRunner({
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

			runner.clearIdleTimer();
		});

		it('should handle different taskBrokerUri formats correctly', () => {
			const runner = new TestRunner({
				taskType: 'test-task',
				maxConcurrency: 5,
				idleTimeout: 60,
				grantToken: 'test-token',
				maxPayloadSize: 1024,
				taskBrokerUri: 'https://example.com:3000/path',
				timezone: 'America/New_York',
				taskTimeout: 60,
				healthcheckServer: {
					enabled: false,
					host: 'localhost',
					port: 8081,
				},
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

			runner.clearIdleTimer();
		});

		it('should throw an error if taskBrokerUri is invalid', () => {
			expect(
				() =>
					new TestRunner({
						taskType: 'test-task',
						maxConcurrency: 5,
						idleTimeout: 60,
						grantToken: 'test-token',
						maxPayloadSize: 1024,
						taskBrokerUri: 'not-a-valid-uri',
						timezone: 'America/New_York',
						taskTimeout: 60,
						healthcheckServer: {
							enabled: false,
							host: 'localhost',
							port: 8081,
						},
					}),
			).toThrowError(/Invalid URL/);
		});
	});

	describe('taskCancelled', () => {
		it('should reject pending requests when task is cancelled', () => {
			const runner = new TestRunner({
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
			});

			const taskId = 'test-task';
			runner.runningTasks.set(taskId, {
				taskId,
				active: false,
				cancelled: false,
			});

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

			runner.taskCancelled(taskId, 'test-reason');

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
