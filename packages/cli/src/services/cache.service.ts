import { Service } from 'typedi';
import config from '@/config';
import { caching } from 'cache-manager';
import type { MemoryCache } from 'cache-manager';
import type { RedisCache } from 'cache-manager-ioredis-yet';
import type { RedisOptions } from 'ioredis';
import { getRedisClusterNodes } from '../GenericHelpers';
import { LoggerProxy, jsonStringify } from 'n8n-workflow';

@Service()
export class CacheService {
	/**
	 * Keys and values:
	 * - `'cache:workflow-owner:${workflowId}'`: `User`
	 */
	private cache: RedisCache | MemoryCache | undefined;

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

			// #region TEMPORARY Redis Client Code
			/*
			 * TODO: remove once redis service is ready
			 * this code is just temporary
			 */
			// eslint-disable-next-line @typescript-eslint/naming-convention
			const { default: Redis } = await import('ioredis');
			let lastTimer = 0;
			let cumulativeTimeout = 0;
			const { host, port, username, password, db }: RedisOptions =
				config.getEnv('queue.bull.redis');
			const clusterNodes = getRedisClusterNodes();
			const redisConnectionTimeoutLimit = config.getEnv('queue.bull.redis.timeoutThreshold');
			const usesRedisCluster = clusterNodes.length > 0;
			LoggerProxy.debug(
				usesRedisCluster
					? `(Cache Service) Initialising Redis cluster connection with nodes: ${clusterNodes
							.map((e) => `${e.host}:${e.port}`)
							.join(',')}`
					: `(Cache Service) Initialising Redis client connection with host: ${
							host ?? 'localhost'
					  } and port: ${port ?? '6379'}`,
			);
			const sharedRedisOptions: RedisOptions = {
				username,
				password,
				db,
				enableReadyCheck: false,
				maxRetriesPerRequest: null,
			};
			const redisClient = usesRedisCluster
				? new Redis.Cluster(
						clusterNodes.map((node) => ({ host: node.host, port: node.port })),
						{
							redisOptions: sharedRedisOptions,
						},
				  )
				: new Redis({
						host,
						port,
						...sharedRedisOptions,
						retryStrategy: (): number | null => {
							const now = Date.now();
							if (now - lastTimer > 30000) {
								// Means we had no timeout at all or last timeout was temporary and we recovered
								lastTimer = now;
								cumulativeTimeout = 0;
							} else {
								cumulativeTimeout += now - lastTimer;
								lastTimer = now;
								if (cumulativeTimeout > redisConnectionTimeoutLimit) {
									LoggerProxy.error(
										`Unable to connect to Redis after ${redisConnectionTimeoutLimit}. Exiting process.`,
									);
									process.exit(1);
								}
							}
							return 500;
						},
				  });
			// #endregion TEMPORARY Redis Client Code
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

	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		if (!this.cache) {
			await this.init();
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

	async setMany<T>(values: Array<[string, T]>, ttl?: number): Promise<void> {
		if (!this.cache) {
			await this.init();
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
