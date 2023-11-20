import { Service } from 'typedi';
import config from '@/config';
import { caching } from 'cache-manager';
import type { MemoryCache } from 'cache-manager';
import type { RedisCache, RedisStore } from './cache/cacheManagerRedis';
import { jsonStringify } from 'n8n-workflow';
import { getDefaultRedisClient, getRedisPrefix } from './redis/RedisServiceHelper';
import EventEmitter from 'events';

@Service()
export class CacheService extends EventEmitter {
	/**
	 * Keys and values:
	 * - `'cache:workflow-owner:${workflowId}'`: `User`
	 */
	private cache: RedisCache | MemoryCache | undefined;

	get isEnabled(): boolean {
		return config.getEnv('cache.enabled');
	}

	metricsCounterEvents = {
		cacheHit: 'metrics.cache.hit',

		cacheMiss: 'metrics.cache.miss',
		cacheUpdate: 'metrics.cache.update',
	};

	isRedisCache(): boolean {
		return (this.cache as RedisCache)?.store?.isCacheable !== undefined;
	}

	/**
	 * Initialize the cache service.
	 *
	 * If the cache is enabled, it will initialize the cache from the provided config options. By default, it will use
	 * the `memory` backend and create a simple in-memory cache. If running in `queue` mode, or if `redis` backend is selected,
	 * it use Redis as the cache backend (either a local Redis instance or a Redis cluster, depending on the config)
	 *
	 * If the cache is disabled, this does nothing.
	 */
	async init(): Promise<void> {
		if (!config.getEnv('cache.enabled')) {
			return;
		}
		const backend = config.getEnv('cache.backend');
		if (
			backend === 'redis' ||
			(backend === 'auto' && config.getEnv('executions.mode') === 'queue')
		) {
			const { redisStoreUsingClient: redisInsStore } = await import(
				'@/services/cache/cacheManagerRedis'
			);
			const redisPrefix = getRedisPrefix(config.getEnv('redis.prefix'));
			const cachePrefix = config.getEnv('cache.redis.prefix');
			const keyPrefix = `${redisPrefix}:${cachePrefix}:`;
			const redisClient = await getDefaultRedisClient({ keyPrefix }, 'client(cache)');
			const redisStore = redisInsStore(redisClient, {
				ttl: config.getEnv('cache.redis.ttl'),
			});
			this.cache = await caching(redisStore);
		} else {
			// using TextEncoder to get the byte length of the string even if it contains unicode characters
			const textEncoder = new TextEncoder();
			this.cache = await caching('memory', {
				ttl: config.getEnv('cache.memory.ttl'),
				maxSize: config.getEnv('cache.memory.maxSize'),
				sizeCalculation: (item) => {
					return textEncoder.encode(jsonStringify(item, { replaceCircularRefs: true })).length;
				},
			});
		}
	}

	/**
	 * Get a value from the cache by key.
	 *
	 * If the value is not in the cache or expired, the refreshFunction is called if defined,
	 * which will set the key with the function's result and returns it. If no refreshFunction is set, the fallback value is returned.
	 *
	 * If the cache is disabled, refreshFunction's result or fallbackValue is returned.
	 *
	 * If cache is not hit, and neither refreshFunction nor fallbackValue are provided, `undefined` is returned.
	 * @param key The key to fetch from the cache
	 * @param options.refreshFunction Optional function to call to set the cache if the key is not found
	 * @param options.refreshTtl Optional ttl for the refreshFunction's set call
	 * @param options.fallbackValue Optional value returned is cache is not hit and refreshFunction is not provided
	 */
	async get(
		key: string,
		options: {
			fallbackValue?: unknown;
			refreshFunction?: (key: string) => Promise<unknown>;
			refreshTtl?: number;
		} = {},
	): Promise<unknown> {
		if (!this.isEnabled) {
			if (options.refreshFunction) {
				return options.refreshFunction(key);
			}
			if (options.fallbackValue) {
				return options.fallbackValue;
			}
			return;
		}
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		const value = await this.cache.store.get(key);
		if (value !== undefined) {
			this.emit(this.metricsCounterEvents.cacheHit);
			return value;
		}
		this.emit(this.metricsCounterEvents.cacheMiss);
		if (options.refreshFunction) {
			this.emit(this.metricsCounterEvents.cacheUpdate);
			const refreshValue = await options.refreshFunction(key);
			await this.set(key, refreshValue, options.refreshTtl);
			return refreshValue;
		}
		return options.fallbackValue ?? undefined;
	}

	/**
	 * Get a single value from a hash in the cache by key and field.
	 *
	 * If the cache is disabled, refreshFunction's result or fallbackValue is returned.
	 *
	 * If cache is not hit, and neither refreshFunction nor fallbackValue are provided, `undefined` is returned.
	 * @param key The key to fetch from the cache
	 * @param field Specific field to fetch from the hash
	 * @returns value of the field in the hash
	 */
	async getHashField(key: string, field: string): Promise<unknown> {
		return this.getHash(key, { fieldName: field });
	}

	/**
	 * Get a hashed object from the cache by its key.
	 *
	 * If the cache is disabled, refreshFunction's result or fallbackValue is returned.
	 *
	 * If cache is not hit, and neither refreshFunction nor fallbackValue are provided, `undefined` is returned.
	 * @param key The key to fetch from the cache
	 * @param options.fieldName Optional specific field to fetch from the hash
	 * @param options.refreshFunction Optional function to call to set the cache if the key is not found
	 * @param options.fallbackValue Optional value returned is cache is not hit and refreshFunction is not provided
	 * @returns an object with the key/value pairs of the hash or a single value if fieldName is provided
	 */
	async getHash<T>(
		key: string,
		options: {
			fieldName?: string;
			fallbackValue?: T | Record<string, unknown>;
			refreshFunction?: (key: string) => Promise<T>;
		} = {},
	): Promise<Record<string, unknown> | T | undefined> {
		if (!this.isEnabled) {
			if (options.refreshFunction) {
				return options.refreshFunction(key);
			}
			if (options.fallbackValue) {
				return options.fallbackValue;
			}
			return;
		}
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		let value = undefined;
		if (this.isRedisCache()) {
			if (options.fieldName) {
				value = (await (this.cache.store as RedisStore).hget(key, options.fieldName)) as T;
			} else {
				value = await (this.cache.store as RedisStore).hgetall(key);
			}
		} else {
			const obj = (await this.cache.store.get(key)) as Record<string, unknown>;
			value = options.fieldName ? (obj?.[options.fieldName] as T) : obj;
		}
		if (value !== undefined) {
			this.emit(this.metricsCounterEvents.cacheHit);
			return value;
		}
		this.emit(this.metricsCounterEvents.cacheMiss);
		if (options.refreshFunction) {
			this.emit(this.metricsCounterEvents.cacheUpdate);
			if (options.fieldName) {
				const refreshValue = await options.refreshFunction(key);
				await this.setHash(key, options.fieldName, refreshValue);
				return refreshValue;
			} else {
				const refreshValue = (await options.refreshFunction(key)) as Record<string, unknown>;
				await this.setHash(key, refreshValue);
				return refreshValue;
			}
		}
		return options.fallbackValue ?? undefined;
	}

	/**
	 * Get many values from a list of keys.
	 *
	 * If a value is not in the cache or expired, the returned list will have `undefined` at that index.
	 * If the cache is disabled, refreshFunction's result or fallbackValue is returned.
	 * If cache is not hit, and neither refreshFunction nor fallbackValue are provided, a list of `undefined` is returned.
	 * @param keys A list of keys to fetch from the cache
	 * @param options.refreshFunctionEach Optional, if defined, undefined values will be replaced with the result of the refreshFunctionEach call and the cache will be updated
	 * @param options.refreshFunctionMany Optional, if defined, all values will be replaced with the result of the refreshFunctionMany call and the cache will be updated
	 * @param options.refreshTtl Optional ttl for the refreshFunction's set call
	 * @param options.fallbackValue Optional value returned is cache is not hit and refreshFunction is not provided
	 */
	async getMany(
		keys: string[],
		options: {
			fallbackValues?: unknown[];
			refreshFunctionEach?: (key: string) => Promise<unknown>;
			refreshFunctionMany?: (keys: string[]) => Promise<unknown[]>;
			refreshTtl?: number;
		} = {},
	): Promise<unknown[]> {
		if (!this.isEnabled) {
			if (options.refreshFunctionMany) {
				return options.refreshFunctionMany(keys);
			}
			if (options.refreshFunctionEach) {
				const values = await Promise.all(
					keys.map(async (key) => options.refreshFunctionEach!(key)),
				);
				return values;
			}
			if (options.fallbackValues) {
				return options.fallbackValues;
			}
			return keys.map(() => undefined);
		}
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		let values = await this.cache.store.mget(...keys);
		if (values === undefined) {
			values = keys.map(() => undefined);
		}
		if (!values.includes(undefined)) {
			this.emit(this.metricsCounterEvents.cacheHit);
			return values;
		}
		this.emit(this.metricsCounterEvents.cacheMiss);
		if (options.refreshFunctionEach) {
			for (let i = 0; i < keys.length; i++) {
				if (values[i] === undefined) {
					const key = keys[i];
					let fallback = undefined;
					if (options.fallbackValues && options.fallbackValues.length > i) {
						fallback = options.fallbackValues[i];
					}
					const refreshValue = await this.get(key, {
						refreshFunction: options.refreshFunctionEach,
						refreshTtl: options.refreshTtl,
						fallbackValue: fallback,
					});
					values[i] = refreshValue;
				}
			}
			return values;
		}
		if (options.refreshFunctionMany) {
			this.emit(this.metricsCounterEvents.cacheUpdate);
			const refreshValues: unknown[] = await options.refreshFunctionMany(keys);
			if (keys.length !== refreshValues.length) {
				throw new Error('refreshFunctionMany must return the same number of values as keys');
			}
			const newKV: Array<[string, unknown]> = [];
			for (let i = 0; i < keys.length; i++) {
				newKV.push([keys[i], refreshValues[i]]);
			}
			await this.setMany(newKV, options.refreshTtl);
			return refreshValues;
		}
		return options.fallbackValues ?? values;
	}

	/**
	 * Set a value in the cache by key.
	 * @param key The key to set
	 * @param value The value to set
	 * @param ttl Optional time to live in ms
	 */
	async set(key: string, value: unknown, ttl?: number): Promise<void> {
		if (!this.isEnabled) {
			return;
		}
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		if (!key || !value) {
			return;
		}
		if (this.isRedisCache()) {
			if (!(this.cache as RedisCache)?.store?.isCacheable(value)) {
				throw new Error('Value is not cacheable');
			}
		}
		await this.cache.store.set(key, value, ttl);
	}

	/**
	 * Set a hash with multiple values
	 * @param key The hash key to set
	 * @param values The values as a Record<string, unknown> or object
	 */
	async setHash(key: string, values: Record<string, unknown>): Promise<void>;
	/**
	 * Set a hash value in the cache by key.
	 * @param key The hash key to set
	 * @param field The field name to set
	 * @param value The value to set
	 */
	async setHash(key: string, field: string, value: unknown): Promise<void>;
	async setHash(
		key: string,
		fieldOrFieldValueRecord: Record<string, unknown> | string,
		value?: unknown,
	): Promise<void> {
		if (!this.isEnabled) {
			return;
		}
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		if (!key) {
			return;
		}
		if (typeof fieldOrFieldValueRecord === 'string') {
			if (value === undefined || value === null) {
				return;
			}
			if (this.isRedisCache()) {
				await (this.cache.store as RedisStore).hset(key, { [fieldOrFieldValueRecord]: value });
			} else {
				const obj = (await this.cache.store.get(key)) ?? {};
				Object.assign(obj, { [fieldOrFieldValueRecord]: value });
				await this.cache.store.set(key, obj);
			}
		} else {
			for (const field in fieldOrFieldValueRecord) {
				const fieldValue = fieldOrFieldValueRecord[field];
				if (fieldValue === undefined || fieldValue === null) {
					return;
				}
			}
			if (this.isRedisCache()) {
				await (this.cache.store as RedisStore).hset(key, fieldOrFieldValueRecord);
			} else {
				const obj = (await this.cache.store.get(key)) ?? {};
				Object.assign(obj, fieldOrFieldValueRecord);
				await this.cache.store.set(key, obj);
			}
		}
	}

	/**
	 * Set a multiple values in the cache at once.
	 * @param values An array of [key, value] tuples to set
	 * @param ttl Optional time to live in ms
	 */
	async setMany(values: Array<[string, unknown]>, ttl?: number): Promise<void> {
		if (!this.isEnabled) {
			return;
		}
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		if (values.length === 0 || !this.cache) {
			return;
		}
		const nonNullValues = values.filter(
			([key, value]) => value !== undefined && value !== null && key && key.length > 0,
		);
		if (this.isRedisCache()) {
			nonNullValues.forEach(([_key, value]) => {
				if (!(this.cache as RedisCache)?.store?.isCacheable(value)) {
					throw new Error('Value is not cacheable');
				}
			});
		}
		await this.cache.store.mset(nonNullValues, ttl);
	}

	/**
	 * Delete a value from the cache by key.
	 * @param key The key to delete
	 */
	async delete(key: string): Promise<void> {
		if (!this.isEnabled) {
			return;
		}
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		if (!key) {
			return;
		}
		await this.cache.store.del(key);
	}

	/**
	 * Delete a value from a cached hash by key and field name.
	 */
	async deleteFromHash(key: string, field: string): Promise<void> {
		if (!this.isEnabled) {
			return;
		}
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		if (!key || !field) {
			return;
		}
		if (this.isRedisCache()) {
			await (this.cache.store as RedisStore).hdel(key, field);
		} else {
			const obj = (await this.cache.store.get(key)) as Record<string, unknown>;
			if (obj) {
				delete obj[field];
				await this.cache.store.set(key, obj);
			}
		}
	}

	/**
	 * Delete multiple values from the cache.
	 * @param keys List of keys to delete
	 */
	async deleteMany(keys: string[]): Promise<void> {
		if (!this.isEnabled) {
			return;
		}
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		if (keys.length === 0) {
			return;
		}
		return this.cache.store.mdel(...keys);
	}

	/**
	 * Delete all values and uninitialized the cache.
	 */
	async destroy() {
		if (this.cache) {
			await this.reset();
			this.cache = undefined;
		}
	}

	/**
	 * Enable and initialize the cache.
	 */
	async enable() {
		config.set('cache.enabled', true);
		await this.init();
	}

	/**
	 * Disable and destroy the cache.
	 */
	async disable() {
		config.set('cache.enabled', false);
		await this.destroy();
	}

	async getCache(): Promise<RedisCache | MemoryCache | undefined> {
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		return this.cache;
	}

	async reset(): Promise<void> {
		await this.cache?.store.reset();
	}

	/**
	 * Return all keys in the cache.
	 */
	async keys(): Promise<string[]> {
		return this.cache?.store.keys() ?? [];
	}

	/**
	 * Return all key/value pairs in the cache. This is a potentially very expensive operation and is only meant to be used for debugging
	 */
	async keyValues(): Promise<Map<string, unknown>> {
		const keys = await this.keys();
		const values = await this.getMany(keys);
		const map = new Map<string, unknown>();
		if (keys.length === values.length) {
			for (let i = 0; i < keys.length; i++) {
				map.set(keys[i], values[i]);
			}
			return map;
		}
		throw new Error(
			'Keys and values do not match, this should not happen and appears to result from some cache corruption.',
		);
	}

	/**
	 * Return all keys in a cached hash.
	 */
	async hashKeys(key: string): Promise<string[]> {
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		if (this.isRedisCache()) {
			return (this.cache.store as RedisStore).hkeys(key);
		} else {
			return this.keys();
		}
	}

	/**
	 * Return all values in a cached hash.
	 */
	async hashValues<T>(key: string): Promise<T[]> {
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		if (this.isRedisCache()) {
			return (this.cache.store as RedisStore).hvals<T>(key);
		} else {
			const obj = (await this.cache.store.get(key)) ?? {};
			return Object.values(obj) as T[];
		}
	}

	/**
	 * Returns whether a field exists in a cached hash.
	 */
	async hashFieldExists(key: string, field: string): Promise<boolean> {
		if (!this.cache) {
			await this.init();
			if (!this.cache) {
				throw new Error('Cache could not be initialized');
			}
		}
		if (!key || !field) {
			return false;
		}
		if (this.isRedisCache()) {
			return (this.cache.store as RedisStore).hexists(key, field);
		} else {
			const obj = await this.cache.store.get(key);
			if (obj === undefined || obj === null) return false;
			return (obj as Record<string, unknown>)[field] !== undefined;
		}
	}
}
