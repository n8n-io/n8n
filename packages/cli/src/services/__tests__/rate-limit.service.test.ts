import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { RateLimitService } from '@/services/rate-limit.service';
import type { RedisClientService } from '@/services/redis-client.service';

jest.mock('ioredis', () => {
	const Redis = require('ioredis-mock');

	return function (...args: unknown[]) {
		return new Redis(args);
	};
});

describe('RateLimitService', () => {
	let logger: Logger;
	let globalConfig: GlobalConfig;

	beforeEach(() => {
		logger = mock<Logger>({
			scoped: jest.fn().mockReturnThis(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
		});

		globalConfig = mock<GlobalConfig>({
			redis: {
				prefix: 'n8n',
			},
			executions: {
				mode: 'regular', // Default to regular mode (in-memory)
			},
		});
	});

	describe('In-Memory Implementation', () => {
		let rateLimitService: RateLimitService;
		let redisClientService: RedisClientService;

		beforeEach(() => {
			// In regular mode, use in-memory store
			globalConfig.executions.mode = 'regular';

			redisClientService = mock<RedisClientService>();

			rateLimitService = new RateLimitService(logger, redisClientService, globalConfig);
		});

		afterEach(() => {
			rateLimitService.shutdown();
		});

		describe('tryConsume()', () => {
			test('should allow requests under the limit', async () => {
				const key = 'test-key';
				const limit = 3;
				const windowMs = 60000;

				// First request
				const status1 = await rateLimitService.tryConsume({ key, limit, windowMs });
				expect(status1.allowed).toBe(true);
				expect(status1.remaining).toBe(2);

				// Second request
				const status2 = await rateLimitService.tryConsume({ key, limit, windowMs });
				expect(status2.allowed).toBe(true);
				expect(status2.remaining).toBe(1);

				// Third request
				const status3 = await rateLimitService.tryConsume({ key, limit, windowMs });
				expect(status3.allowed).toBe(true);
				expect(status3.remaining).toBe(0);
			});

			test('should block requests over the limit', async () => {
				const key = 'test-key';
				const limit = 3;
				const windowMs = 60000;

				// Make 3 requests (at the limit)
				await rateLimitService.tryConsume({ key, limit, windowMs });
				await rateLimitService.tryConsume({ key, limit, windowMs });
				await rateLimitService.tryConsume({ key, limit, windowMs });

				// Fourth request should be blocked
				const status = await rateLimitService.tryConsume({ key, limit, windowMs });
				expect(status.allowed).toBe(false);
				expect(status.remaining).toBe(0);
			});

			test('should reset limit after window expires', async () => {
				const key = 'test-key';
				const limit = 2;
				const windowMs = 100; // Short window for testing

				// Make 2 requests (at the limit)
				await rateLimitService.tryConsume({ key, limit, windowMs });
				await rateLimitService.tryConsume({ key, limit, windowMs });

				// Third request should be blocked
				let status = await rateLimitService.tryConsume({ key, limit, windowMs });
				expect(status.allowed).toBe(false);

				// Wait for window to expire
				await new Promise((resolve) => setTimeout(resolve, windowMs + 10));

				// Should allow requests again
				status = await rateLimitService.tryConsume({ key, limit, windowMs });
				expect(status.allowed).toBe(true);
				expect(status.remaining).toBe(1);
			});

			test('should track different keys separately', async () => {
				const limit = 2;
				const windowMs = 60000;

				// Make 2 requests for key1 (at the limit)
				await rateLimitService.tryConsume({ key: 'key1', limit, windowMs });
				await rateLimitService.tryConsume({ key: 'key1', limit, windowMs });

				// key1 should be limited
				let status = await rateLimitService.tryConsume({ key: 'key1', limit, windowMs });
				expect(status.allowed).toBe(false);

				// key2 should not be limited
				status = await rateLimitService.tryConsume({ key: 'key2', limit, windowMs });
				expect(status.allowed).toBe(true);
			});
		});

		describe('get()', () => {
			test('should return status without consuming', async () => {
				const key = 'test-key';
				const limit = 5;
				const windowMs = 60000;

				// Initially should have full limit
				let status = await rateLimitService.get({ key, limit, windowMs });
				expect(status.allowed).toBe(true);
				expect(status.remaining).toBe(5);

				// Consume some
				await rateLimitService.tryConsume({ key, limit, windowMs });
				await rateLimitService.tryConsume({ key, limit, windowMs });

				// Get status should reflect consumed amount
				status = await rateLimitService.get({ key, limit, windowMs });
				expect(status.allowed).toBe(true);
				expect(status.remaining).toBe(3);
			});
		});

		describe('reset()', () => {
			test('should reset rate limit for a key', async () => {
				const key = 'test-key';
				const limit = 3;
				const windowMs = 60000;

				// Consume all requests
				await rateLimitService.tryConsume({ key, limit, windowMs });
				await rateLimitService.tryConsume({ key, limit, windowMs });
				await rateLimitService.tryConsume({ key, limit, windowMs });

				// Should be limited
				let status = await rateLimitService.tryConsume({ key, limit, windowMs });
				expect(status.allowed).toBe(false);

				// Reset
				await rateLimitService.reset({ key });

				// Should be able to consume again
				status = await rateLimitService.tryConsume({ key, limit, windowMs });
				expect(status.allowed).toBe(true);
				expect(status.remaining).toBe(2);
			});
		});
	});

	describe('Redis Implementation', () => {
		let rateLimitService: RateLimitService;
		let redisClientService: RedisClientService;

		beforeEach(() => {
			// In queue mode, use Redis
			globalConfig.executions.mode = 'queue';

			redisClientService = mock<RedisClientService>({
				toValidPrefix: jest.fn().mockReturnValue('{n8n:rate-limit}'),
				createClient: jest.fn().mockReturnValue({
					pipeline: jest.fn().mockReturnValue({
						incr: jest.fn().mockReturnThis(),
						pexpire: jest.fn().mockReturnThis(),
						pttl: jest.fn().mockReturnThis(),
						get: jest.fn().mockReturnThis(),
						exec: jest.fn().mockResolvedValue([
							[null, 1], // incr result
							[null, 1], // pexpire result (1 = expiry was set)
							[null, 60000], // pttl result
						]),
					}),
					get: jest.fn().mockResolvedValue('0'),
					del: jest.fn().mockResolvedValue(1),
				}),
			});

			rateLimitService = new RateLimitService(logger, redisClientService, globalConfig);
		});

		afterEach(() => {
			rateLimitService.shutdown();
		});

		test('should use Redis when available', () => {
			expect(logger.info).toHaveBeenCalledWith('Rate limiting using Redis', {
				prefix: '{n8n:rate-limit}:',
			});
		});

		test('should consume using Redis pipeline', async () => {
			const key = 'test-key';
			const limit = 3;
			const windowMs = 60000;

			const redisClient = (rateLimitService as any).redisClient;
			const pipeline = redisClient.pipeline();

			const status = await rateLimitService.tryConsume({ key, limit, windowMs });

			expect(pipeline.incr).toHaveBeenCalledWith(key);
			expect(pipeline.pexpire).toHaveBeenCalledWith(key, windowMs, 'NX');
			expect(pipeline.pttl).toHaveBeenCalledWith(key);
			expect(status.allowed).toBe(true);
		});

		test('should fail open on Redis errors', async () => {
			const key = 'test-key';
			const limit = 3;
			const windowMs = 60000;

			const redisClient = (rateLimitService as any).redisClient;
			redisClient.pipeline.mockReturnValue({
				incr: jest.fn().mockReturnThis(),
				pexpire: jest.fn().mockReturnThis(),
				pttl: jest.fn().mockReturnThis(),
				exec: jest.fn().mockRejectedValue(new Error('Redis connection error')),
			});

			const status = await rateLimitService.tryConsume({ key, limit, windowMs });

			expect(status.allowed).toBe(true); // Fail open - allow the request
			expect(logger.error).toHaveBeenCalledWith(
				'Error consuming rate limit in Redis, failing open',
				expect.any(Object),
			);
		});
	});

	describe('Shutdown', () => {
		test('should clean up resources gracefully', () => {
			// Use regular mode (in-memory) for this test
			globalConfig.executions.mode = 'regular';

			const redisClientService = mock<RedisClientService>();

			const rateLimitService = new RateLimitService(logger, redisClientService, globalConfig);

			rateLimitService.shutdown();

			expect(logger.debug).toHaveBeenCalledWith('Rate limit service shutdown');
		});
	});
});
