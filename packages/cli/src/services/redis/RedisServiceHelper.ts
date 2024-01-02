import type Redis from 'ioredis';
import type { Cluster, RedisOptions } from 'ioredis';
import config from '@/config';
import type { RedisClientType } from './RedisServiceBaseClasses';
import Container from 'typedi';
import { Logger } from '@/Logger';

export const EVENT_BUS_REDIS_STREAM = 'n8n:eventstream';
export const COMMAND_REDIS_STREAM = 'n8n:commandstream';
export const WORKER_RESPONSE_REDIS_STREAM = 'n8n:workerstream';
export const EVENT_BUS_REDIS_CHANNEL = 'n8n.events';
export const COMMAND_REDIS_CHANNEL = 'n8n.commands';
export const WORKER_RESPONSE_REDIS_CHANNEL = 'n8n.worker-response';
export const WORKER_RESPONSE_REDIS_LIST = 'n8n:list:worker-response';

export function getRedisClusterNodes(): Array<{ host: string; port: number }> {
	const clusterNodePairs = config
		.getEnv('queue.bull.redis.clusterNodes')
		.split(',')
		.filter((e) => e);
	return clusterNodePairs.map((pair) => {
		const [host, port] = pair.split(':');
		return { host, port: parseInt(port) };
	});
}

export function getRedisPrefix(customPrefix?: string): string {
	let prefix = customPrefix ?? config.getEnv('redis.prefix');
	if (prefix && getRedisClusterNodes().length > 0) {
		if (!prefix.startsWith('{')) {
			prefix = '{' + prefix;
		}
		if (!prefix.endsWith('}')) {
			prefix += '}';
		}
	}
	return prefix;
}

export function getRedisStandardClient(
	redis: typeof Redis,
	redisOptions?: RedisOptions,
	redisType?: RedisClientType,
): Redis | Cluster {
	let lastTimer = 0;
	let cumulativeTimeout = 0;
	const { host, port, username, password, db }: RedisOptions = config.getEnv('queue.bull.redis');
	const redisConnectionTimeoutLimit = config.getEnv('queue.bull.redis.timeoutThreshold');
	const sharedRedisOptions: RedisOptions = {
		...redisOptions,
		host,
		port,
		username,
		password,
		db,
		enableReadyCheck: false,
		maxRetriesPerRequest: null,
	};
	if (config.getEnv('queue.bull.redis.tls')) sharedRedisOptions.tls = {};

	const logger = Container.get(Logger);
	logger.debug(
		`Initialising Redis client${redisType ? ` of type ${redisType}` : ''} connection with host: ${
			host ?? 'localhost'
		} and port: ${port ?? '6379'}`,
	);
	return new redis({
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
					logger.error(
						`Unable to connect to Redis after ${redisConnectionTimeoutLimit}. Exiting process.`,
					);
					process.exit(1);
				}
			}
			return 500;
		},
	});
}

export function getRedisClusterClient(
	redis: typeof Redis,
	redisOptions?: RedisOptions,
	redisType?: RedisClientType,
): Cluster {
	let lastTimer = 0;
	let cumulativeTimeout = 0;
	const clusterNodes = getRedisClusterNodes();
	const { username, password, db }: RedisOptions = config.getEnv('queue.bull.redis');
	const redisConnectionTimeoutLimit = config.getEnv('queue.bull.redis.timeoutThreshold');
	const sharedRedisOptions: RedisOptions = {
		...redisOptions,
		username,
		password,
		db,
		enableReadyCheck: false,
		maxRetriesPerRequest: null,
	};
	if (config.getEnv('queue.bull.redis.tls')) sharedRedisOptions.tls = {};

	const logger = Container.get(Logger);
	logger.debug(
		`Initialising Redis cluster${
			redisType ? ` of type ${redisType}` : ''
		} connection with nodes: ${clusterNodes.map((e) => `${e.host}:${e.port}`).join(',')}`,
	);
	return new redis.Cluster(
		clusterNodes.map((node) => ({ host: node.host, port: node.port })),
		{
			redisOptions: sharedRedisOptions,
			clusterRetryStrategy: (): number | null => {
				const now = Date.now();
				if (now - lastTimer > 30000) {
					// Means we had no timeout at all or last timeout was temporary and we recovered
					lastTimer = now;
					cumulativeTimeout = 0;
				} else {
					cumulativeTimeout += now - lastTimer;
					lastTimer = now;
					if (cumulativeTimeout > redisConnectionTimeoutLimit) {
						logger.error(
							`Unable to connect to Redis after ${redisConnectionTimeoutLimit}. Exiting process.`,
						);
						process.exit(1);
					}
				}
				return 500;
			},
		},
	);
}

export async function getDefaultRedisClient(
	additionalRedisOptions?: RedisOptions,
	redisType?: RedisClientType,
): Promise<Redis | Cluster> {
	const { default: Redis } = await import('ioredis');
	const clusterNodes = getRedisClusterNodes();
	const usesRedisCluster = clusterNodes.length > 0;
	return usesRedisCluster
		? getRedisClusterClient(Redis, additionalRedisOptions, redisType)
		: getRedisStandardClient(Redis, additionalRedisOptions, redisType);
}
