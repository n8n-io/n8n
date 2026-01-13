import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Redis, Cluster } from 'ioredis';

import { RedisClientService } from './redis-client.service';

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

export interface RateLimitOptions {
	key: string;
	limit: number;
	windowMs: number;
}

export interface RateLimitStatus {
	allowed: boolean;
	remaining: number;
	resetAt: Date;
}

@Service()
export class RateLimitService {
	private inMemoryStore = new Map<string, RateLimitEntry>();

	private redisClient?: Redis | Cluster;

	private cleanupInterval?: NodeJS.Timeout;

	constructor(
		private readonly logger: Logger,
		private readonly redisClientService: RedisClientService,
		private readonly globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped('rate-limit');

		// Use Redis when in queue/scaling mode (same pattern as CacheService)
		const useRedis = this.globalConfig.executions.mode === 'queue';

		if (useRedis) {
			try {
				// Create prefix for rate limiting keys following cluster-mode hash tagging pattern
				const prefixBase = this.globalConfig.redis.prefix; // e.g., 'n8n'
				const rateLimitPrefix = 'rate-limit';

				// For cluster mode, we need proper hash tagging: {n8n:rate-limit}:
				const hashTagPart = `${prefixBase}:${rateLimitPrefix}`;
				const prefix = this.redisClientService.toValidPrefix(hashTagPart) + ':';

				this.redisClient = this.redisClientService.createClient({
					type: 'rate-limit(n8n)',
					extraOptions: { keyPrefix: prefix },
				});

				this.logger.info('Rate limiting using Redis', { prefix });
			} catch (error) {
				this.logger.warn(
					'Failed to create Redis client for rate limiting, falling back to in-memory',
					{ error },
				);
			}
		} else {
			this.logger.info('Rate limiting using in-memory store');
		}

		// Start cleanup interval for in-memory store
		if (!this.redisClient) {
			this.startCleanupInterval();
		}
	}

	/**
	 * Attempts to consume one request from the rate limit.
	 * This is the primary method for rate limiting - it atomically checks and increments
	 * the counter only if the limit has not been exceeded.
	 *
	 * @returns Status object with allowed flag, remaining attempts, and reset time
	 * @example
	 * const status = await rateLimitService.tryConsume({ key: 'user@example.com', limit: 3, windowMs: 60000 });
	 * if (!status.allowed) {
	 *   // Request blocked - rate limit exceeded
	 *   return;
	 * }
	 * // Proceed with operation
	 */
	async tryConsume({ key, limit, windowMs }: RateLimitOptions): Promise<RateLimitStatus> {
		if (this.redisClient) {
			return await this.tryConsumeRedis({ key, limit, windowMs });
		}

		return this.tryConsumeMemory({ key, limit, windowMs });
	}

	/**
	 * Get the current rate limit status without consuming a request.
	 * Useful for displaying rate limit information to users or checking status
	 * before deciding whether to attempt an operation.
	 *
	 * @returns Current status including allowed flag, remaining attempts, and reset time
	 */
	async get({ key, limit, windowMs }: RateLimitOptions): Promise<RateLimitStatus> {
		if (this.redisClient) {
			return await this.getRedis({ key, limit, windowMs });
		}

		return this.getMemory({ key, limit, windowMs });
	}

	async reset({ key }: { key: string }): Promise<void> {
		if (this.redisClient) {
			try {
				await this.redisClient.del(key);
			} catch (error) {
				this.logger.error('Error resetting rate limit in Redis', { error, key });
			}
		} else {
			this.inMemoryStore.delete(key);
		}
	}

	private async tryConsumeRedis({
		key,
		limit,
		windowMs,
	}: RateLimitOptions): Promise<RateLimitStatus> {
		try {
			// Use Redis pipeline for atomic operations
			const pipeline = this.redisClient!.pipeline();
			pipeline.incr(key);
			pipeline.pexpire(key, windowMs, 'NX'); // Only set expiry if key has no expiry (Redis 7.0+)
			pipeline.pttl(key);

			const results = await pipeline.exec();

			if (!results) {
				this.logger.error('Redis pipeline returned null, failing open', { key });
				return {
					allowed: true,
					remaining: limit,
					resetAt: new Date(Date.now() + windowMs),
				};
			}

			const [[incrErr, count], [expireErr], [ttlErr, ttl]] = results as Array<
				[Error | null, number]
			>;

			// Check for errors in pipeline results and fail open
			if (incrErr) {
				this.logger.error('Error incrementing rate limit counter in Redis, failing open', {
					error: incrErr,
					key,
				});

				return {
					allowed: true,
					remaining: limit,
					resetAt: new Date(Date.now() + windowMs),
				};
			}

			if (expireErr) {
				this.logger.error('Error setting expiry for rate limit in Redis, failing open', {
					error: expireErr,
					key,
				});

				return {
					allowed: true,
					remaining: limit,
					resetAt: new Date(Date.now() + windowMs),
				};
			}

			if (ttlErr) {
				this.logger.error('Error getting TTL for rate limit in Redis, failing open', {
					error: ttlErr,
					key,
				});

				return {
					allowed: true,
					remaining: limit,
					resetAt: new Date(Date.now() + windowMs),
				};
			}

			const resetAt = new Date(Date.now() + (ttl > 0 ? ttl : windowMs));
			const remaining = Math.max(0, limit - count);
			const allowed = count <= limit;

			return { allowed, remaining, resetAt };
		} catch (error) {
			this.logger.error('Error consuming rate limit in Redis, failing open', { error, key });

			return {
				allowed: true,
				remaining: limit,
				resetAt: new Date(Date.now() + windowMs),
			};
		}
	}

	private async getRedis({ key, limit, windowMs }: RateLimitOptions): Promise<RateLimitStatus> {
		try {
			const pipeline = this.redisClient!.pipeline().get(key).pttl(key);

			const results = await pipeline.exec();

			if (!results) {
				this.logger.error('Redis pipeline returned null, failing open', { key });

				return {
					allowed: true,
					remaining: limit,
					resetAt: new Date(Date.now() + windowMs),
				};
			}

			const [[countErr, countValue], [ttlErr, ttl]] = results as Array<
				[Error | null, string | number | null]
			>;

			// Check for errors in pipeline results and fail open
			if (countErr || ttlErr) {
				this.logger.error('Error getting rate limit count from Redis, failing open', {
					error: countErr,
					key,
				});

				return {
					allowed: true,
					remaining: limit,
					resetAt: new Date(Date.now() + windowMs),
				};
			}

			const count = countValue ? parseInt(countValue as string, 10) : 0;
			const remaining = Math.max(0, limit - count);
			const allowed = count < limit;
			const ttlValue = typeof ttl === 'number' ? ttl : 0;
			const resetAt = new Date(Date.now() + (ttlValue > 0 ? ttlValue : windowMs));

			return { allowed, remaining, resetAt };
		} catch (error) {
			this.logger.error('Error getting rate limit status from Redis, failing open', {
				error,
				key,
			});

			return {
				allowed: true,
				remaining: limit,
				resetAt: new Date(Date.now() + windowMs),
			};
		}
	}

	private tryConsumeMemory({ key, limit, windowMs }: RateLimitOptions): RateLimitStatus {
		const now = Date.now();
		const entry = this.inMemoryStore.get(key);

		if (!entry || now >= entry.resetAt) {
			const resetAt = now + windowMs;
			this.inMemoryStore.set(key, { count: 1, resetAt });

			return {
				allowed: true,
				remaining: limit - 1,
				resetAt: new Date(resetAt),
			};
		}

		entry.count++;

		const remaining = Math.max(0, limit - entry.count);
		const allowed = entry.count <= limit;

		return { allowed, remaining, resetAt: new Date(entry.resetAt) };
	}

	private getMemory({ key, limit, windowMs }: RateLimitOptions): RateLimitStatus {
		const now = Date.now();
		const entry = this.inMemoryStore.get(key);

		if (!entry || now >= entry.resetAt) {
			return {
				allowed: true,
				remaining: limit,
				resetAt: new Date(now + windowMs),
			};
		}

		const remaining = Math.max(0, limit - entry.count);
		const allowed = entry.count < limit;

		return { allowed, remaining, resetAt: new Date(entry.resetAt) };
	}

	private startCleanupInterval(): void {
		this.cleanupInterval = setInterval(() => {
			const now = Date.now();
			let cleanedCount = 0;

			for (const [key, entry] of this.inMemoryStore.entries()) {
				if (now >= entry.resetAt) {
					this.inMemoryStore.delete(key);
					cleanedCount++;
				}
			}

			if (cleanedCount > 0) {
				this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
			}
		}, 60_000);

		// Calling unref() allows Node.js to exit if this interval is the only active handle.
		// Without it, this interval would keep the process alive indefinitely even during shutdown.
		// This is important for graceful process termination - the interval won't block the process
		// from exiting when everything else has finished.
		this.cleanupInterval.unref();

		this.logger.debug('Started cleanup interval for in-memory rate limit store');
	}

	shutdown(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = undefined;
		}

		this.inMemoryStore.clear();
		this.logger.debug('Rate limit service shutdown');
	}
}
