import { Service } from 'typedi';
import config from '@/config';
import { caching } from 'cache-manager';
import type { MemoryCache } from 'cache-manager';
import type { RedisCache } from 'cache-manager-ioredis-yet';
import { jsonStringify } from 'n8n-workflow';
import { getDefaultRedisClient } from './redis/RedisServiceHelper';

@Service()
export class CacheService {
	private cache: RedisCache | MemoryCache | undefined;

	isRedisCache(): boolean {
		return (this.cache as RedisCache)?.store?.isCacheable !== undefined;
	}

	async init() {
		if (!config.getEnv('cache.enabled')) {
			throw new Error('Cache is disabled');
		}
		const backend = config.getEnv('cache.backend');
		if (
			backend === 'redis' ||
			(backend === 'auto' && config.getEnv('executions.mode') === 'queue')
		) {
			const { redisInsStore } = await import('cache-manager-ioredis-yet');
			const redisClient = await getDefaultRedisClient(undefined, 'client(cache)');
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

	async destroy() {
		if (this.cache) {
			await this.reset();
			this.cache = undefined;
		}
	}

	async getCache(): Promise<RedisCache | MemoryCache | undefined> {
		if (!this.cache) {
			await this.init();
		}
		return this.cache;
	}

	async get<T>(key: string): Promise<T> {
		if (!this.cache) {
			await this.init();
		}
		return this.cache?.store.get(key) as T;
	}

	async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
		if (!this.cache) {
			await this.init();
		}
		if (this.isRedisCache()) {
			if (!(this.cache as RedisCache)?.store?.isCacheable(value)) {
				throw new Error('Value is not cacheable');
			}
		}
		return this.cache?.store.set(key, value, ttl);
	}

	async delete(key: string): Promise<void> {
		if (!this.cache) {
			await this.init();
		}
		return this.cache?.store.del(key);
	}

	async reset(): Promise<void> {
		if (!this.cache) {
			await this.init();
		}
		return this.cache?.store.reset();
	}

	async keys(): Promise<string[]> {
		if (!this.cache) {
			await this.init();
		}
		return this.cache?.store.keys() ?? [];
	}

	async setMany<T = unknown>(values: Array<[string, T]>, ttl?: number): Promise<void> {
		if (!this.cache) {
			await this.init();
		}
		if (this.isRedisCache()) {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			values.forEach(([_key, value]) => {
				if (!(this.cache as RedisCache)?.store?.isCacheable(value)) {
					throw new Error('Value is not cacheable');
				}
			});
		}
		return this.cache?.store.mset(values, ttl);
	}

	async getMany<T>(keys: string[]): Promise<Array<[string, T]>> {
		if (!this.cache) {
			await this.init();
		}
		return this.cache?.store.mget(...keys) as Promise<Array<[string, T]>>;
	}

	async deleteMany(keys: string[]): Promise<void> {
		if (!this.cache) {
			await this.init();
		}
		return this.cache?.store.mdel(...keys);
	}
}
