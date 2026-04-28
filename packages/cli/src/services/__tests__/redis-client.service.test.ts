import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import Redis from 'ioredis';

import { RedisClientService } from '@/services/redis-client.service';

type EventHandler = (...args: unknown[]) => void;

jest.mock('ioredis', () => {
	return jest.fn().mockImplementation(() => {
		return {
			on: jest.fn(),
		};
	});
});

describe('RedisClientService', () => {
	const logger = mockInstance(Logger);
	logger.scoped.mockReturnValue(logger);

	const globalConfig = mockInstance(GlobalConfig, {
		queue: {
			bull: {
				redis: {
					host: 'localhost',
					port: 6379,
					db: 0,
					timeoutThreshold: 10000,
					clusterNodes: '',
					keepAlive: undefined,
				},
			},
		},
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ioRedis constructor overloads prevent jest.mocked() from typing calls correctly
	const mockedRedis = Redis as unknown as jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should create client with basic options', () => {
		const service = new RedisClientService(logger, globalConfig);
		service.createClient({ type: 'client(bull)' });

		expect(Redis).toHaveBeenCalledWith(
			expect.objectContaining({
				host: 'localhost',
				port: 6379,
				db: 0,
				enableReadyCheck: false,
				maxRetriesPerRequest: null,
			}),
		);

		const callArgs = mockedRedis.mock.calls[0][0];
		expect(callArgs).not.toHaveProperty('keepAlive');
	});

	it('should add keepAlive options when configured', () => {
		globalConfig.queue.bull.redis.keepAlive = true;
		globalConfig.queue.bull.redis.keepAliveDelay = 123;
		globalConfig.queue.bull.redis.keepAliveInterval = 456;

		const service = new RedisClientService(logger, globalConfig);
		service.createClient({ type: 'client(bull)' });

		expect(Redis).toHaveBeenCalledWith(
			expect.objectContaining({
				keepAlive: 123,
				keepAliveInterval: 456,
			}),
		);
	});

	it('should set reconnectOnFailover when configured', () => {
		globalConfig.queue.bull.redis.reconnectOnFailover = true;

		const service = new RedisClientService(logger, globalConfig);
		service.createClient({ type: 'client(bull)' });

		expect(Redis).toHaveBeenCalledWith(
			expect.objectContaining({
				reconnectOnError: expect.any(Function),
			}),
		);
	});

	describe('connection recovery', () => {
		it('should set lostConnection synchronously in retryStrategy', () => {
			const service = new RedisClientService(logger, globalConfig);
			service.createClient({ type: 'client(bull)' });

			expect(service.isConnected()).toBe(true);

			const callArgs = mockedRedis.mock.calls[0][0];
			const retryStrategy = callArgs.retryStrategy as () => number;

			retryStrategy();

			expect(service.isConnected()).toBe(false);
		});

		it('should recover when ready fires after retryStrategy', () => {
			const service = new RedisClientService(logger, globalConfig);
			service.createClient({ type: 'client(bull)' });

			const mockClient = mockedRedis.mock.results[0].value;
			const handlers = new Map<string, EventHandler>();
			jest.mocked(mockClient.on).mock.calls.forEach(([event, handler]: [string, EventHandler]) => {
				handlers.set(event, handler);
			});

			const callArgs = mockedRedis.mock.calls[0][0];
			const retryStrategy = callArgs.retryStrategy as () => number;

			retryStrategy();
			expect(service.isConnected()).toBe(false);

			handlers.get('ready')!();
			expect(service.isConnected()).toBe(true);
		});
	});
});
