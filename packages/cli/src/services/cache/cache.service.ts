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
	Hash,
} from '@/services/cache/cache.types';
import { TIME } from '@/constants';

@Service()
export class CacheService extends EventEmitter {
	private cache: TaggedRedisCache | TaggedMemoryCache;

	async init() {
		const backend = config.getEnv('cache.backend');
		const mode = config.getEnv('executions.mode');
		const ttl = config.getEnv('cache.redis.ttl');

		const useRedis = backend === 'redis' || (backend === 'auto' && mode === 'queue');

		if (useRedis) {
			const keyPrefix = `${getRedisPrefix()}:${config.getEnv('cache.redis.prefix')}:`;
			const redisClient = await getDefaultRedisClient({ keyPrefix }, 'client(cache)');

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
	 * stored under a key in the cache. If in-memory, the hash is a regular JS object.
	 */
	async setHash(key: string, hash: Hash) {
		if (!this.cache) await this.init();

		if (!key?.length) return;

		for (const hashKey in hash) {
			if (hash[hashKey] === undefined || hash[hashKey] === null) return;
		}

		if (this.cache.kind === 'redis') {
			await this.cache.store.hset(key, hash);
			return;
		}

		const hashObject: Hash = (await this.get(key)) ?? {};

		Object.assign(hashObject, hash);

		await this.set(key, hashObject);
	}

	async expire(key: string, ttlMs: number) {
		if (!this.cache) await this.init();

		if (!key?.length) return;

		if (this.cache.kind === 'memory') {
			setTimeout(async () => {
				await this.cache.store.del(key);
			}, ttlMs);
			return;
		}

		await this.cache.store.expire(key, ttlMs / TIME.SECOND);
	}

	// ----------------------------------
	//            retrieving
	// ----------------------------------

	/**
	 * Retrieve a primitive value under a key. To retrieve a hash, use `getHash`, and
	 * to retrieve a primitive value in a hash, use `getHashValue`.
	 */
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

			const newValue: Array<[key: string, value: unknown]> = keys.map((key, i) => [
				key,
				refreshValue[i],
			]);

			await this.setMany(newValue);

			return refreshValue;
		}

		return fallbackValue;
	}

	/**
	 * Retrieve a [Redis hash](https://redis.io/docs/data-types/hashes/) under a key.
	 * If in-memory, the hash is a regular JS object. To retrieve a primitive value
	 * in the hash, use `getHashValue`.
	 */
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

			return hash;
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
	 * Retrieve a primitive value in a [Redis hash](https://redis.io/docs/data-types/hashes/)
	 * under a hash key. If in-memory, the hash is a regular JS object. To retrieve the hash
	 * itself, use `getHash`.
	 */
	async getHashValue<T = unknown>(
		cacheKey: string,
		hashKey: string,
		{
			fallbackValue,
			refreshFn,
		}: { fallbackValue?: T; refreshFn?: (key: string) => Promise<T | undefined> } = {},
	) {
		if (!this.cache) await this.init();

		let hashValue: MaybeHash<T>;

		if (this.cache.kind === 'redis') {
			hashValue = await this.cache.store.hget(cacheKey, hashKey);
		} else {
			const hashObject = await this.cache.store.get<Hash<T>>(cacheKey);

			hashValue = hashObject?.[hashKey] as MaybeHash<T>;
		}

		if (hashValue !== undefined) {
			this.emit('metrics.cache.hit');

			return hashValue as T;
		}

		this.emit('metrics.cache.miss');

		if (refreshFn) {
			this.emit('metrics.cache.update');

			const refreshValue = await refreshFn(cacheKey);
			await this.set(cacheKey, refreshValue);

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

		return await this.cache.store.mdel(...keys);
	}

	/**
	 * Delete a value under a key in a [Redis hash](https://redis.io/docs/data-types/hashes/).
	 * If in-memory, the hash is a regular JS object. To delete the hash itself, use `delete`.
	 */
	async deleteFromHash(cacheKey: string, hashKey: string) {
		if (!this.cache) await this.init();

		if (!cacheKey || !hashKey) return;

		if (this.cache.kind === 'redis') {
			await this.cache.store.hdel(cacheKey, hashKey);
			return;
		}

		const hashObject = await this.get<Hash>(cacheKey);

		if (!hashObject) return;

		delete hashObject[hashKey];

		await this.cache.store.set(cacheKey, hashObject);
	}
}
