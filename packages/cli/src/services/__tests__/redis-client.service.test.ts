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

		it("should not reset another client's retry state when one client recovers", () => {
			const T0 = 1_700_000_000_000;
			const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(T0);
			const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

			const service = new RedisClientService(logger, globalConfig);
			service.createClient({ type: 'client(bull)' });
			service.createClient({ type: 'subscriber(bull)' });

			const retryA = mockedRedis.mock.calls[0][0].retryStrategy as () => number;

			const mockClientB = mockedRedis.mock.results[1].value;
			const handlersB = new Map<string, EventHandler>();
			jest.mocked(mockClientB.on).mock.calls.forEach(([event, handler]: [string, EventHandler]) => {
				handlersB.set(event, handler);
			});

			// Client A retries, building up cumulative timeout.
			dateNowSpy.mockReturnValue(T0 + 1_000);
			retryA();
			dateNowSpy.mockReturnValue(T0 + 2_000);
			retryA();
			dateNowSpy.mockReturnValue(T0 + 3_000);
			retryA();

			// Client B reconnects. Must not affect Client A's retry state.
			dateNowSpy.mockReturnValue(T0 + 4_000);
			handlersB.get('ready')!();

			// Client A continues failing past the threshold. Should still exit.
			dateNowSpy.mockReturnValue(T0 + 12_001);
			retryA();

			expect(exitSpy).toHaveBeenCalledWith(1);

			dateNowSpy.mockRestore();
			exitSpy.mockRestore();
		});

		it("should reset each client's retry state on its own ready, regardless of aggregate state", () => {
			const T0 = 1_700_000_000_000;
			const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(T0);
			const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

			const service = new RedisClientService(logger, globalConfig);
			service.createClient({ type: 'client(bull)' });
			service.createClient({ type: 'subscriber(bull)' });

			const retryA = mockedRedis.mock.calls[0][0].retryStrategy as () => number;
			const retryB = mockedRedis.mock.calls[1][0].retryStrategy as () => number;

			const handlersA = new Map<string, EventHandler>();
			jest
				.mocked(mockedRedis.mock.results[0].value.on)
				.mock.calls.forEach(([event, handler]: [string, EventHandler]) => {
					handlersA.set(event, handler);
				});
			const handlersB = new Map<string, EventHandler>();
			jest
				.mocked(mockedRedis.mock.results[1].value.on)
				.mock.calls.forEach(([event, handler]: [string, EventHandler]) => {
					handlersB.set(event, handler);
				});

			// Both clients enter retry. B accumulates state.
			dateNowSpy.mockReturnValue(T0 + 1_000);
			retryA();
			retryB();
			dateNowSpy.mockReturnValue(T0 + 2_000);
			retryB();

			// A recovers first — flips lostConnection to false.
			dateNowSpy.mockReturnValue(T0 + 3_000);
			handlersA.get('ready')!();

			// B recovers. Per-client reset must run even though lostConnection is already false.
			dateNowSpy.mockReturnValue(T0 + 4_000);
			handlersB.get('ready')!();

			// B disconnects again at 15s. Without per-client reset, B carries stale state from
			// window 1, the 13s healthy interval gets billed to cumulative, and the process exits.
			dateNowSpy.mockReturnValue(T0 + 15_000);
			retryB();

			expect(exitSpy).not.toHaveBeenCalled();

			dateNowSpy.mockRestore();
			exitSpy.mockRestore();
		});

		it('should not exit when a new disconnect occurs after recovery within the reset window', () => {
			const T0 = 1_700_000_000_000;
			const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(T0);
			const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

			const service = new RedisClientService(logger, globalConfig);
			service.createClient({ type: 'client(bull)' });

			const mockClient = mockedRedis.mock.results[0].value;
			const handlers = new Map<string, EventHandler>();
			jest.mocked(mockClient.on).mock.calls.forEach(([event, handler]: [string, EventHandler]) => {
				handlers.set(event, handler);
			});

			const callArgs = mockedRedis.mock.calls[0][0];
			const retryStrategy = callArgs.retryStrategy as () => number;

			// Disconnect window 1: drop at 10s, retry fails at 11s, recover at 12s
			dateNowSpy.mockReturnValue(T0 + 10_000);
			retryStrategy();
			dateNowSpy.mockReturnValue(T0 + 11_000);
			retryStrategy();
			dateNowSpy.mockReturnValue(T0 + 12_000);
			handlers.get('ready')!();

			// Disconnect window 2: drop at 25s, within 30s of the last failed retry.
			dateNowSpy.mockReturnValue(T0 + 25_000);
			retryStrategy();

			expect(exitSpy).not.toHaveBeenCalled();

			dateNowSpy.mockRestore();
			exitSpy.mockRestore();
		});
	});
});
