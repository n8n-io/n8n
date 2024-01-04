import type { MemoryCache } from 'cache-manager';
import type { RedisCache } from '@/services/cache/redis.cache-manager';

export type TaggedRedisCache = RedisCache & { kind: 'redis' };

export type TaggedMemoryCache = MemoryCache & { kind: 'memory' };

export type MaybeHash<T> = Record<string, T> | undefined;

export type CacheEvent = `metrics.cache.${'hit' | 'miss' | 'update'}`;
