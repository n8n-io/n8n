import { Service } from 'typedi';
import config from '@/config';
import { caching } from 'cache-manager';
import type { MemoryCache } from 'cache-manager';
import type { RedisCache } from './cache/cacheManagerRedis';
import { jsonStringify } from 'n8n-workflow';
import { getDefaultRedisClient, getRedisPrefix } from './redis/RedisServiceHelper';
import EventEmitter from 'events';
import { NonCacheableInRedisError } from '@/errors/non-cacheable-in-redis.error';

type TaggedRedisCache = RedisCache & { kind: 'redis' };
type TaggedMemoryCache = MemoryCache & { kind: 'memory' };

type MaybeHashRecord = Record<string, unknown> | undefined;
type CacheEvent = `metrics.cache.${'hit' | 'miss' | 'update'}`;

@Service()
export class CacheService extends EventEmitter {
	private cache: TaggedRedisCache | TaggedMemoryCache;

	get isEnabled() {
		return config.getEnv('cache.enabled');
	}

	isRedisCache() {
		return this.cache.kind === 'redis';
	}

	isMemoryCache() {
		return this.cache.kind === 'memory';
	}

	async init() {
		if (!this.isEnabled) return;

		const backend = config.getEnv('cache.backend');
		const mode = config.getEnv('executions.mode');
		const ttl = config.getEnv('cache.redis.ttl');

		const useRedis = backend === 'redis' || (backend === 'auto' && mode === 'queue');

		if (useRedis) {
			const redisClient = await getDefaultRedisClient(
				{ keyPrefix: `${getRedisPrefix()}:${config.getEnv('cache.redis.prefix')}:` },
				'client(cache)',
			);

			const { redisStoreUsingClient } = await import('@/services/cache/cacheManagerRedis');
			const redisStore = redisStoreUsingClient(redisClient, { ttl });

			const redisCache = await caching(redisStore);

			this.cache = { ...redisCache, kind: 'redis' };

			return;
		}

		const maxSize = config.getEnv('cache.memory.maxSize');

		const sizeCalculation = (item: unknown) => {
			const str = jsonStringify(item, { replaceCircularRefs: true });
			return new TextEncoder().encode(str).length;
		};

		const memoryCache = await caching('memory', { ttl, maxSize, sizeCalculation });

		this.cache = { ...memoryCache, kind: 'memory' };
	}

	async get<T = unknown>(
		key: string,
		{
			fallbackValue,
			refreshFn,
		}: { fallbackValue?: T; refreshFn?: (key: string) => Promise<T> } = {},
	) {
		if (key?.length === 0) return;

		const value = await this.cache.store.get<T>(key);

		if (value !== undefined) {
			this.emit('metrics.cache.hit');

			return value;
		}

		this.emit('metrics.cache.miss');

		if (refreshFn) {
			this.emit('metrics.cache.update');

			const refreshValue = await refreshFn(key);
			await this.set(key, refreshValue);

			return refreshValue;
		}

		return fallbackValue;
	}

	async getHashValueByField<T = unknown>(key: string, field: string) {
		let value: unknown;

		if (this.cache.kind === 'redis') {
			value = await this.cache.store.hget(key, field);
		} else {
			const record: MaybeHashRecord = await this.cache.store.get(key);

			if (record) value = record[field];
		}

		if (value !== undefined) {
			this.emit('metrics.cache.hit');

			return value as T;
		}

		this.emit('metrics.cache.miss');

		return value as T;
	}

	async getHashValue<T = unknown>(key: string, { fallbackValue }: { fallbackValue?: T } = {}) {
		const value: MaybeHashRecord =
			this.cache.kind === 'redis'
				? await this.cache.store.hgetall(key)
				: await this.cache.store.get(key);

		if (value !== undefined) {
			this.emit('metrics.cache.hit');

			return value;
		}

		this.emit('metrics.cache.miss');

		return fallbackValue;
	}

	async getMany<T = unknown[]>(keys: string[]) {
		if (keys.length === 0) return [];

		const values = await this.cache.store.mget(...keys);

		if (values !== undefined) {
			this.emit('metrics.cache.hit');

			return values as T[];
		}

		this.emit('metrics.cache.miss');

		return [];
	}

	async set(key: string, value: unknown, ttl?: number) {
		if (!key || !value) return;

		if (this.cache.kind === 'redis' && !this.cache.store.isCacheable(value)) {
			throw new NonCacheableInRedisError(key);
		}

		await this.cache.store.set(key, value, ttl);
	}

	async setHash(key: string, record: Record<string, unknown>) {
		if (!key?.length) return;

		for (const field in record) {
			if (record[field] === undefined || record[field] === null) return;
		}

		if (this.cache.kind === 'redis') {
			await this.cache.store.hset(key, record);
			return;
		}

		const obj: Record<string, unknown> = (await this.cache.store.get(key)) ?? {};

		Object.assign(obj, record);

		await this.cache.store.set(key, obj);
	}

	async setMany(keysValues: Array<[key: string, value: unknown]>, ttl?: number) {
		if (keysValues.length === 0) return;

		const truthyKeysValues = keysValues.filter(
			([key, value]) => key?.length > 0 && value !== undefined && value !== null,
		);

		if (this.cache.kind === 'redis') {
			for (const [key, value] of truthyKeysValues) {
				if (!this.cache.store.isCacheable(value)) {
					throw new NonCacheableInRedisError(key);
				}
			}
		}

		await this.cache.store.mset(truthyKeysValues, ttl);
	}

	async delete(key: string) {
		if (!key?.length) return;

		await this.cache.store.del(key);
	}

	async deleteFromHash(key: string, field: string) {
		if (!key || !field) return;

		if (this.cache.kind === 'redis') {
			await this.cache.store.hdel(key, field);
			return;
		}

		const obj: Record<string, unknown> | undefined = await this.cache.store.get(key);

		if (!obj) return;

		delete obj[field];

		await this.cache.store.set(key, obj);
	}

	async deleteMany(keys: string[]) {
		if (keys.length === 0) return;

		return this.cache.store.mdel(...keys);
	}

	async reset() {
		await this.cache.store.reset();
	}

	async allKeys() {
		return this.cache.store.keys();
	}

	emit(event: CacheEvent, ...args: unknown[]) {
		return super.emit(event, ...args);
	}
}
