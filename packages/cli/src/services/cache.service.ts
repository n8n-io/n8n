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

type MaybeHash = Record<string, unknown> | undefined;
type CacheEvent = `metrics.cache.${'hit' | 'miss' | 'update'}`;

@Service()
export class CacheService extends EventEmitter {
	private cache: TaggedRedisCache | TaggedMemoryCache;

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

	async reset() {
		await this.cache.store.reset();
	}

	emit(event: CacheEvent, ...args: unknown[]) {
		return super.emit(event, ...args);
	}

	get isEnabled() {
		return config.getEnv('cache.enabled');
	}

	async enable() {
		config.set('cache.enabled', true);

		await this.init();
	}

	async disable() {
		config.set('cache.enabled', false);

		await this.reset();
	}

	isRedis() {
		return this.cache.kind === 'redis';
	}

	isMemory() {
		return this.cache.kind === 'memory';
	}

	// ----------------------------------
	//       setting and getting
	// ----------------------------------

	async set(key: string, value: unknown, ttl?: number) {
		if (!this.cache) await this.init();

		if (!key || !value) return;

		if (this.cache.kind === 'redis' && !this.cache.store.isCacheable(value)) {
			throw new NonCacheableInRedisError(key);
		}

		await this.cache.store.set(key, value, ttl);
	}

	async get<T = unknown>(
		key: string,
		{
			fallbackValue,
			refreshFn,
		}: { fallbackValue?: T; refreshFn?: (key: string) => Promise<T> } = {},
	) {
		if (!this.cache) await this.init();

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

	async getMany<T = unknown[]>(keys: string[]) {
		if (!this.cache) await this.init();

		if (keys.length === 0) return [];

		const values = await this.cache.store.mget(...keys);

		if (values !== undefined) {
			this.emit('metrics.cache.hit');

			return values as T[];
		}

		this.emit('metrics.cache.miss');

		return [];
	}

	async getAllKeys() {
		if (!this.cache) await this.init();

		return this.cache.store.keys();
	}

	async setMany(keysValues: Array<[key: string, value: unknown]>, ttl?: number) {
		if (!this.cache) await this.init();

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
		if (!this.cache) await this.init();

		if (!key?.length) return;

		await this.cache.store.del(key);
	}

	async deleteMany(keys: string[]) {
		if (!this.cache) await this.init();

		if (keys.length === 0) return;

		return this.cache.store.mdel(...keys);
	}

	// ----------------------------------
	//             hashes
	// ----------------------------------

	async setHash(key: string, hash: Record<string, unknown>) {
		if (!this.cache) await this.init();

		if (!key?.length) return;

		for (const field in hash) {
			if (hash[field] === undefined || hash[field] === null) return;
		}

		if (this.cache.kind === 'redis') {
			await this.cache.store.hset(key, hash);
			return;
		}

		const hashObject: Record<string, unknown> = (await this.get(key)) ?? {};

		Object.assign(hashObject, hash);

		await this.set(key, hashObject);
	}

	async getHash<T = unknown>(key: string, { fallbackValue }: { fallbackValue?: T } = {}) {
		if (!this.cache) await this.init();

		const hash: MaybeHash =
			this.cache.kind === 'redis' ? await this.cache.store.hgetall(key) : await this.get(key);

		if (hash !== undefined) {
			this.emit('metrics.cache.hit');

			return hash as T;
		}

		this.emit('metrics.cache.miss');

		return fallbackValue;
	}

	async getHashValue<T = unknown>(
		key: string,
		field: string,
		{ fallbackValue }: { fallbackValue?: T } = {},
	) {
		if (!this.cache) await this.init();

		let hashValue: unknown;

		if (this.cache.kind === 'redis') {
			hashValue = await this.cache.store.hget(key, field);
		} else {
			const hashObject: MaybeHash = await this.cache.store.get(key);

			hashValue = hashObject?.[field];
		}

		if (hashValue !== undefined) {
			this.emit('metrics.cache.hit');

			return hashValue as T;
		}

		this.emit('metrics.cache.miss');

		return fallbackValue;
	}

	async deleteFromHash(key: string, field: string) {
		if (!this.cache) await this.init();

		if (!key || !field) return;

		if (this.cache.kind === 'redis') {
			await this.cache.store.hdel(key, field);
			return;
		}

		const hashObject: MaybeHash = await this.get(key);

		if (!hashObject) return;

		delete hashObject[field];

		await this.cache.store.set(key, hashObject);
	}
}
