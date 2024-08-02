import { Config, Env, Nested } from '../decorators';

@Config
class MemoryConfig {
	/** Max size of memory cache in bytes */
	@Env('N8N_CACHE_MEMORY_MAX_SIZE')
	readonly maxSize: number = 3 * 1024 * 1024; // 3 MiB

	/** Time to live (in milliseconds) for data cached in memory. */
	@Env('N8N_CACHE_MEMORY_TTL')
	readonly ttl: number = 3600 * 1000; // 1 hour
}

@Config
class RedisConfig {
	/** Prefix for cache keys in Redis. */
	@Env('N8N_CACHE_REDIS_KEY_PREFIX')
	readonly prefix: string = 'redis';

	/** Time to live (in milliseconds) for data cached in Redis. 0 for no TTL. */
	@Env('N8N_CACHE_REDIS_TTL')
	readonly ttl: number = 3600 * 1000; // 1 hour
}

@Config
export class CacheConfig {
	/** Backend to use for caching. */
	@Env('N8N_CACHE_BACKEND')
	readonly backend: 'memory' | 'redis' | 'auto' = 'auto';

	@Nested
	readonly memory: MemoryConfig;

	@Nested
	readonly redis: RedisConfig;
}
