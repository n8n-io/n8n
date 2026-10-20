import type { Logger } from '@n8n/backend-common';
import type { RedisClientService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { Cluster, Redis } from 'ioredis';
import RedisMock from 'ioredis-mock';
import type { InstanceSettings } from 'n8n-core';
import { createHash } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { PublicApiRateLimitStoreFactory } from '@/public-api/public-api-rate-limit-store.factory';

export type Mode = 'single main' | 'multi-main';

const loadedScripts = new Map<string, string>();

/** `ioredis-mock` cannot save scripts, so this fake saves them in a map and runs them with `EVAL`. */
export function redisClient(
	failsOn: (command: string) => boolean = () => false,
	scripts: Map<string, string> = loadedScripts,
) {
	const redis = new RedisMock() as unknown as Record<
		string,
		(...args: string[]) => Promise<unknown>
	>;
	const call = async (command: string, ...args: string[]) => {
		if (failsOn(command)) throw new Error('Redis is not reachable');
		if (command === 'SCRIPT') {
			const script = args[1];
			const sha = createHash('sha1').update(script).digest('hex');
			scripts.set(sha, script);
			return sha;
		}
		if (command === 'EVALSHA') {
			const [sha, ...rest] = args;
			const script = scripts.get(sha);
			if (!script) throw new Error('NOSCRIPT No matching script');
			return await redis.eval(script, ...rest);
		}
		return await redis[command.toLowerCase()](...args);
	};
	return mock<Redis>({ isCluster: false, call: call as Redis['call'] }) as unknown as Redis;
}

/**
 * A real cluster can save a script on one node and then look for it on another node.
 * This fake always does that, to test that the factory saves scripts on every node.
 */
export function redisCluster() {
	const nodeWithoutCounters = redisClient(undefined, new Map());
	const nodeWithCounters = redisClient(undefined, new Map());
	const call = async (command: string, ...args: string[]) =>
		await (command === 'SCRIPT' ? nodeWithoutCounters : nodeWithCounters).call(command, ...args);
	return mock<Cluster>({
		isCluster: true,
		nodes: () => [nodeWithoutCounters, nodeWithCounters],
		call: call as Cluster['call'],
	}) as unknown as Cluster;
}

export function createStoreFactory(
	mode: Mode,
	{
		createRedisClient = () => redisClient(),
		logger = mock<Logger>(),
		redisPrefix = 'n8n',
	}: { createRedisClient?: () => Redis | Cluster; logger?: Logger; redisPrefix?: string } = {},
) {
	return new PublicApiRateLimitStoreFactory(
		logger,
		mock<GlobalConfig>({ redis: { prefix: redisPrefix } }),
		mock<InstanceSettings>({ isMultiMain: mode === 'multi-main' }),
		mock<RedisClientService>({
			createClient: createRedisClient,
			toValidPrefix: (prefix: string) => prefix,
		}),
	);
}
