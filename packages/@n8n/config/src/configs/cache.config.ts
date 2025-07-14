import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

const cacheBackendSchema = z.enum(['memory', 'redis', 'auto']);
type CacheBackend = z.infer<typeof cacheBackendSchema>;

@Config
class MemoryConfig {
	/** Max size of memory cache in bytes */
	@Env('N8N_CACHE_MEMORY_MAX_SIZE')
	maxSize: number = 3 * 1024 * 1024; // 3 MiB

	/** Time to live (in milliseconds) for data cached in memory. */
	@Env('N8N_CACHE_MEMORY_TTL')
	ttl: number = 3600 * 1000; // 1 hour
}

@Config
class RedisConfig {
	/** Prefix for cache keys in Redis. */
	@Env('N8N_CACHE_REDIS_KEY_PREFIX')
	prefix: string = 'cache';

	/** Time to live (in milliseconds) for data cached in Redis. 0 for no TTL. */
	@Env('N8N_CACHE_REDIS_TTL')
	ttl: number = 3600 * 1000; // 1 hour
}

@Config
export class CacheConfig {
	/** Backend to use for caching. */
	@Env('N8N_CACHE_BACKEND', cacheBackendSchema)
	backend: CacheBackend = 'auto';

	@Nested
	memory: MemoryConfig;

	@Nested
	redis: RedisConfig;
}
