import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

const cacheBackendSchema = z.enum(['memory', 'redis', 'auto']);
type CacheBackend = z.infer<typeof cacheBackendSchema>;

@Config
class MemoryConfig {
	/** Maximum size of the in-memory cache in bytes. Default: 3 MiB. */
	@Env('N8N_CACHE_MEMORY_MAX_SIZE')
	maxSize: number = 3 * 1024 * 1024; // 3 MiB

	/** Time to live in milliseconds for entries in the memory cache. Default: 1 hour. */
	@Env('N8N_CACHE_MEMORY_TTL')
	ttl: number = 3600 * 1000; // 1 hour
}

@Config
class RedisConfig {
	/** Key prefix for cache entries stored in Redis. */
	@Env('N8N_CACHE_REDIS_KEY_PREFIX')
	prefix: string = 'cache';

	/** Time to live in milliseconds for Redis cache entries. Set to 0 to disable expiry. Default: 1 hour. */
	@Env('N8N_CACHE_REDIS_TTL')
	ttl: number = 3600 * 1000; // 1 hour
}

@Config
export class CacheConfig {
	/** Cache backend: `memory`, `redis`, or `auto` (choose based on deployment). */
	@Env('N8N_CACHE_BACKEND', cacheBackendSchema)
	backend: CacheBackend = 'auto';

	@Nested
	memory: MemoryConfig;

	@Nested
	redis: RedisConfig;
}
