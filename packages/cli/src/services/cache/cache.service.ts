import EventEmitter from 'node:events';

import { Service } from 'typedi';
import { caching } from 'cache-manager';
import { jsonStringify } from 'n8n-workflow';

import config from '@/config';
import { getDefaultRedisClient, getRedisPrefix } from '@/services/redis/RedisServiceHelper';
import { UncacheableValueError } from '@/errors/cache-errors/uncacheable-value.error';
import { MalformedRefreshValueError } from '@/errors/cache-errors/malformed-refresh-value.error';
import type {
	TaggedRedisCache,
	TaggedMemoryCache,
	CacheEvent,
	MaybeHash,
} from '@/services/cache/cache.types';

@Service()
export class CacheService extends EventEmitter {
	private cache: TaggedRedisCache | TaggedMemoryCache;

	async init() {
		const backend = config.getEnv('cache.backend');
		const mode = config.getEnv('executions.mode');
		const ttl = config.getEnv('cache.redis.ttl');

		const useRedis = backend === 'redis' || (backend === 'auto' && mode === 'queue');

		if (useRedis) {
			const redisClient = await getDefaultRedisClient(
				{ keyPrefix: `${getRedisPrefix()}:${config.getEnv('cache.redis.prefix')}:` },
				'client(cache)',
			);

			const { redisStoreUsingClient } = await import('@/services/cache/redis.cache-manager');
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

	isRedis() {
		return this.cache.kind === 'redis';
	}

	isMemory() {
		return this.cache.kind === 'memory';
	}

	// ----------------------------------
	//             storing
	// ----------------------------------

	async set(key: string, value: unknown, ttl?: number) {
		if (!this.cache) await this.init();

		if (!key || !value) return;

		if (this.cache.kind === 'redis' && !this.cache.store.isCacheable(value)) {
			throw new UncacheableValueError(key);
		}

		await this.cache.store.set(key, value, ttl);
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
					throw new UncacheableValueError(key);
				}
			}
		}

		await this.cache.store.mset(truthyKeysValues, ttl);
	}

	/**
	 * Set or append to a [Redis hash](https://redis.io/docs/data-types/hashes/)
	 * stored under a key in the cache. If in-memory, use a regular JS object.
	 */
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

	// ----------------------------------
	//            retrieving
	// ----------------------------------

	async get<T = unknown>(
		key: string,
		{
			fallbackValue,
			refreshFn,
		}: { fallbackValue?: T; refreshFn?: (key: string) => Promise<T | undefined> } = {},
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

	async getMany<T = unknown[]>(
		keys: string[],
		{
			fallbackValue,
			refreshFn,
		}: {
			fallbackValue?: T[];
			refreshFn?: (keys: string[]) => Promise<T[]>;
		} = {},
	) {
		if (!this.cache) await this.init();

		if (keys.length === 0) return [];

		const values = await this.cache.store.mget(...keys);

		if (values !== undefined) {
			this.emit('metrics.cache.hit');

			return values as T[];
		}

		this.emit('metrics.cache.miss');

		if (refreshFn) {
			this.emit('metrics.cache.update');

			const refreshValue: T[] = await refreshFn(keys);

			if (keys.length !== refreshValue.length) {
				throw new MalformedRefreshValueError();
			}

			const newValue: Array<[string, unknown]> = keys.map((key, i) => [key, refreshValue[i]]);

			await this.setMany(newValue);

			return refreshValue;
		}

		return fallbackValue;
	}

	async getHash<T = unknown>(
		key: string,
		{
			fallbackValue,
			refreshFn,
		}: { fallbackValue?: T; refreshFn?: (key: string) => Promise<MaybeHash<T>> } = {},
	) {
		if (!this.cache) await this.init();

		const hash: MaybeHash<T> =
			this.cache.kind === 'redis' ? await this.cache.store.hgetall(key) : await this.get(key);

		if (hash !== undefined) {
			this.emit('metrics.cache.hit');

			return hash as MaybeHash<T>;
		}

		this.emit('metrics.cache.miss');

		if (refreshFn) {
			this.emit('metrics.cache.update');

			const refreshValue = await refreshFn(key);
			await this.set(key, refreshValue);

			return refreshValue;
		}

		return fallbackValue as MaybeHash<T>;
	}

	/**
	 * Retrieve a value under a field in a [Redis hash](https://redis.io/docs/data-types/hashes/).
	 * If in-memory, use a regular JS object. To retrieve the hash itself, use `get`.
	 */
	async getHashValue<T = unknown>(
		key: string,
		field: string,
		{
			fallbackValue,
			refreshFn,
		}: { fallbackValue?: T; refreshFn?: (key: string) => Promise<T | undefined> } = {},
	) {
		if (!this.cache) await this.init();

		let hashValue: unknown;

		if (this.cache.kind === 'redis') {
			hashValue = await this.cache.store.hget(key, field);
		} else {
			const hashObject: MaybeHash<T> = await this.cache.store.get(key);

			hashValue = hashObject?.[field];
		}

		if (hashValue !== undefined) {
			this.emit('metrics.cache.hit');

			return hashValue as T;
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

	// ----------------------------------
	//            deleting
	// ----------------------------------

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

	/**
	 * Delete a value under a field in a [Redis hash](https://redis.io/docs/data-types/hashes/).
	 * If in-memory, use a regular JS object. To delete the hash itself, use `delete`.
	 */
	async deleteFromHash<T = unknown>(key: string, field: string) {
		if (!this.cache) await this.init();

		if (!key || !field) return;

		if (this.cache.kind === 'redis') {
			await this.cache.store.hdel(key, field);
			return;
		}

		const hashObject: MaybeHash<T> = await this.get(key);

		if (!hashObject) return;

		delete hashObject[field];

		await this.cache.store.set(key, hashObject);
	}
}
