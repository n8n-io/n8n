import { Logger } from '@n8n/backend-common';
import { RedisClientService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { MemoryStore } from 'express-rate-limit';
import type { IncrementResponse, Store } from 'express-rate-limit';
import type { Cluster, Redis } from 'ioredis';
import { InstanceSettings } from 'n8n-core';
import { RedisStore } from 'rate-limit-redis';
import type { Options as RedisStoreOptions, RedisReply } from 'rate-limit-redis';

/** Logs once when Redis starts to fail, and once when it works again. */
class RedisHealth {
	private failing = false;

	constructor(private readonly logger: Logger) {}

	succeeded() {
		if (!this.failing) return;
		this.failing = false;
		this.logger.info('Public API rate limiting can reach Redis again');
	}

	failed(error: unknown) {
		if (this.failing) return;
		this.failing = true;
		this.logger.warn(
			'Public API rate limiting cannot reach Redis. Requests are not limited until Redis is back.',
			{ error: ensureError(error) },
		);
	}
}

class ReportingRedisStore extends RedisStore {
	constructor(
		options: RedisStoreOptions,
		private readonly health: RedisHealth,
	) {
		super(options);
		// `RedisStore` from `rate-limit-redis` starts to load its scripts in its constructor, and
		// nothing awaits these promises. So a failure would be an unhandled rejection. The store
		// loads the scripts again when it needs them.
		this.incrementScriptSha.catch(() => {});
		this.getScriptSha.catch(() => {});
	}

	async increment(key: string): Promise<IncrementResponse> {
		try {
			const response = await super.increment(key);
			this.health.succeeded();
			return response;
		} catch (error) {
			this.health.failed(error);
			throw error;
		}
	}

	/** Does not throw, so that a failed decrement does not stop the 429. */
	async decrement(key: string): Promise<void> {
		try {
			await super.decrement(key);
		} catch (error) {
			this.health.failed(error);
		}
	}
}

/**
 * A single main keeps the Public API rate-limit counts in memory. On multi-main, the counts are
 * in Redis, so that all mains share them.
 */
@Service()
export class PublicApiRateLimitStoreFactory {
	private redisClient: Redis | Cluster | undefined;

	private readonly redisHealth: RedisHealth;

	constructor(
		logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly redisClientService: RedisClientService,
	) {
		this.redisHealth = new RedisHealth(logger);
	}

	/** @param name Identifies one limiter. Two limiters must not use the same name. */
	create(name: string): Store {
		if (!this.instanceSettings.isMultiMain) return new MemoryStore();

		const prefix = this.redisClientService.toValidPrefix(this.globalConfig.redis.prefix);
		return new ReportingRedisStore(
			{ prefix: `${prefix}:rate-limit:public-api:${name}:`, sendCommand: this.sendRedisCommand },
			this.redisHealth,
		);
	}

	private sendRedisCommand = async (command: string, ...args: string[]): Promise<RedisReply> => {
		const client = this.getRedisClient();
		// The store saves its counting script in Redis with `SCRIPT LOAD`. In a cluster, the script
		// must be on the node that holds the counter, but the cluster sends it to a random node. So
		// save it on every node.
		if (client.isCluster && command === 'SCRIPT') {
			const [sha] = await Promise.all(
				(client as Cluster).nodes('master').map(async (node) => await node.call(command, ...args)),
			);
			return sha as RedisReply;
		}
		return (await client.call(command, ...args)) as RedisReply;
	};

	private getRedisClient() {
		// Fail fast while Redis is slow or down. The request then passes without a limit.
		this.redisClient ??= this.redisClientService.createClient({
			type: 'rate-limit(n8n)',
			extraOptions: { commandTimeout: 500, enableOfflineQueue: false },
		});
		return this.redisClient;
	}
}
