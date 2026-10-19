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

/** A slow Redis must not hold a Public API request open. */
const COMMAND_TIMEOUT_MS = 500;

type RedisHealth = { onSuccess: () => void; onFailure: (error: unknown) => void };

class ReportingRedisStore extends RedisStore {
	constructor(
		options: RedisStoreOptions,
		private readonly health: RedisHealth,
	) {
		super(options);
		// The store loads its scripts here and again when a command needs them. Nothing awaits
		// these first loads, so a failure would be an unhandled rejection.
		this.incrementScriptSha.catch(() => {});
		this.getScriptSha.catch(() => {});
	}

	/** On a failure, `passOnStoreError` lets the request pass. */
	async increment(key: string): Promise<IncrementResponse> {
		try {
			const response = await super.increment(key);
			this.health.onSuccess();
			return response;
		} catch (error) {
			this.health.onFailure(error);
			throw error;
		}
	}

	/** On a failure, the count stays one too high until the window ends. */
	async decrement(key: string): Promise<void> {
		try {
			await super.decrement(key);
		} catch (error) {
			this.health.onFailure(error);
		}
	}
}

/**
 * Creates the stores for the Public API rate-limit counts. A single main keeps them in memory.
 * On multi-main, the counts are in Redis, so that all mains share them.
 */
@Service()
export class PublicApiRateLimitStoreFactory {
	private redisClient: Redis | Cluster | undefined;

	private redisFails = false;

	private readonly redisHealth: RedisHealth = {
		onSuccess: () => {
			if (!this.redisFails) return;
			this.redisFails = false;
			this.logger.info('Public API rate limiting can reach Redis again');
		},
		onFailure: (error) => {
			if (this.redisFails) return;
			this.redisFails = true;
			this.logger.warn(
				'Public API rate limiting cannot reach Redis. Requests are not limited until Redis is back.',
				{ error: ensureError(error) },
			);
		},
	};

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly redisClientService: RedisClientService,
	) {}

	/** @param name Identifies one limiter. Two limiters must not use the same name. */
	create(name: string): Store {
		if (!this.instanceSettings.isMultiMain) return new MemoryStore();

		const prefix = this.redisClientService.toValidPrefix(this.globalConfig.redis.prefix);
		return new ReportingRedisStore(
			{
				prefix: `${prefix}:rate-limit:public-api:${name}:`,
				sendCommand: async (command: string, ...args: string[]) =>
					(await this.getRedisClient().call(command, ...args)) as RedisReply,
			},
			this.redisHealth,
		);
	}

	private getRedisClient() {
		this.redisClient ??= this.redisClientService.createClient({
			type: 'rate-limit(n8n)',
			// Without the offline queue, a command fails at once while Redis is down, so the request
			// passes instead of waiting for a reconnect.
			extraOptions: { commandTimeout: COMMAND_TIMEOUT_MS, enableOfflineQueue: false },
		});
		return this.redisClient;
	}
}
