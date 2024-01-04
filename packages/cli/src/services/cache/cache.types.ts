import type { MemoryCache } from 'cache-manager';
import type { RedisCache } from '@/services/cache/redis.cache-manager';

export type TaggedRedisCache = RedisCache & { kind: 'redis' };
export type TaggedMemoryCache = MemoryCache & { kind: 'memory' };

export type MaybeHash = Record<string, unknown> | undefined;
export type CacheEvent = `metrics.cache.${'hit' | 'miss' | 'update'}`;

export type RetrieveOneOptions<T> = { fallbackValue?: T; refreshFn?: (key: string) => Promise<T> };
export type RetrieveManyOptions<T> = {
	fallbackValue?: T[];
	refreshFn?: (keys: string[]) => Promise<T[]>;
};
