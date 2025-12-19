/**
 * Based on https://github.com/node-cache-manager/node-cache-manager-ioredis-yet
 */

import type { Cache, Store, Config } from 'cache-manager';
import Redis from 'ioredis';
import type { Cluster, ClusterNode, ClusterOptions, RedisOptions } from 'ioredis';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

export class NoCacheableError implements Error {
	name = 'NoCacheableError';

	constructor(public message: string) {}
}

export const avoidNoCacheable = async <T>(p: Promise<T>) => {
	try {
		return await p;
	} catch (e) {
		if (!(e instanceof NoCacheableError)) throw e;
		return undefined;
	}
};

export interface RedisClusterConfig {
	nodes: ClusterNode[];
	options?: ClusterOptions;
}

export type RedisCache = Cache<RedisStore>;

export interface RedisStore extends Store {
	readonly isCacheable: (value: unknown) => boolean;
	get client(): Redis | Cluster;
	hget<T>(key: string, field: string): Promise<T | undefined>;
	hgetall<T>(key: string): Promise<Record<string, T> | undefined>;
	hset(key: string, fieldValueRecord: Record<string, unknown>): Promise<void>;
	hkeys(key: string): Promise<string[]>;
	hvals<T>(key: string): Promise<T[]>;
	hexists(key: string, field: string): Promise<boolean>;
	hdel(key: string, field: string): Promise<number>;
	expire(key: string, ttlSeconds: number): Promise<void>;
}

function builder(
	redisCache: Redis | Cluster,
	reset: () => Promise<void>,
	keys: (pattern: string) => Promise<string[]>,
	options?: Config,
) {
	const isCacheable = options?.isCacheable ?? ((value) => value !== undefined && value !== null);
	const getVal = (value: unknown) => JSON.stringify(value) || '"undefined"';

	return {
		async get<T>(key: string) {
			const val = await redisCache.get(key);
			if (val === undefined || val === null) return undefined;
			else return jsonParse<T>(val);
		},
		async expire(key: string, ttlSeconds: number) {
			await redisCache.expire(key, ttlSeconds);
		},
		async set(key, value, ttl) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error, @typescript-eslint/restrict-template-expressions
			if (!isCacheable(value)) throw new NoCacheableError(`"${value}" is not a cacheable value`);
			const t = ttl ?? options?.ttl;
			if (t !== undefined && t !== 0) await redisCache.set(key, getVal(value), 'PX', t);
			else await redisCache.set(key, getVal(value));
		},
		async mset(args, ttl) {
			const t = ttl ?? options?.ttl;
			if (t !== undefined && t !== 0) {
				const multi = redisCache.multi();
				for (const [key, value] of args) {
					if (!isCacheable(value))
						// eslint-disable-next-line @typescript-eslint/only-throw-error
						throw new NoCacheableError(`"${getVal(value)}" is not a cacheable value`);
					multi.set(key, getVal(value), 'PX', t);
				}
				await multi.exec();
			} else
				await redisCache.mset(
					args.flatMap(([key, value]) => {
						if (!isCacheable(value))
							throw new UnexpectedError(`"${getVal(value)}" is not a cacheable value`);
						return [key, getVal(value)] as [string, string];
					}),
				);
		},
		mget: async (...args) =>
			await redisCache
				.mget(args)
				.then((results) =>
					results.map((result) =>
						result === null || result === undefined ? undefined : jsonParse(result),
					),
				),
		async mdel(...args) {
			await redisCache.del(args);
		},
		async del(key) {
			await redisCache.del(key);
		},
		ttl: async (key) => await redisCache.pttl(key),
		keys: async (pattern = '*') => await keys(pattern),
		reset,
		isCacheable,
		get client() {
			return redisCache;
		},
		// Redis Hash functions
		async hget<T>(key: string, field: string) {
			const val = await redisCache.hget(key, field);
			if (val === undefined || val === null) return undefined;
			else return jsonParse<T>(val);
		},
		async hgetall<T>(key: string) {
			const val = await redisCache.hgetall(key);
			if (val === undefined || val === null) return undefined;
			else {
				for (const field in val) {
					const value = val[field];
					val[field] = jsonParse(value);
				}
				return val as Record<string, T>;
			}
		},
		async hset(key: string, fieldValueRecord: Record<string, unknown>) {
			for (const field in fieldValueRecord) {
				const value = fieldValueRecord[field];
				if (!isCacheable(fieldValueRecord[field])) {
					// eslint-disable-next-line @typescript-eslint/only-throw-error, @typescript-eslint/restrict-template-expressions
					throw new NoCacheableError(`"${value}" is not a cacheable value`);
				}
				fieldValueRecord[field] = getVal(value);
			}
			await redisCache.hset(key, fieldValueRecord);
		},
		async hkeys(key: string) {
			return await redisCache.hkeys(key);
		},
		async hvals<T>(key: string): Promise<T[]> {
			const values = await redisCache.hvals(key);
			return values.map((value) => jsonParse<T>(value));
		},
		async hexists(key: string, field: string): Promise<boolean> {
			return (await redisCache.hexists(key, field)) === 1;
		},
		async hdel(key: string, field: string) {
			return await redisCache.hdel(key, field);
		},
	} as RedisStore;
}

export function redisStoreUsingClient(redisCache: Redis | Cluster, options?: Config) {
	const reset = async () => {
		await redisCache.flushdb();
	};
	const keys = async (pattern: string) => await redisCache.keys(pattern);

	return builder(redisCache, reset, keys, options);
}

export async function redisStore(
	options?: (RedisOptions | { clusterConfig: RedisClusterConfig }) & Config,
) {
	options ||= {};
	const redisCache =
		'clusterConfig' in options
			? new Redis.Cluster(options.clusterConfig.nodes, options.clusterConfig.options)
			: new Redis(options);

	return redisStoreUsingClient(redisCache, options);
}
