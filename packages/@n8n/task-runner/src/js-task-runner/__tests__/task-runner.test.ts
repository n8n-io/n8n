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
						healthcheckServer: {
							enabled: false,
							host: 'localhost',
							port: 8081,
						},
					}),
			).toThrowError(/Invalid URL/);
		});
	});
});
