import { Service } from 'typedi';
import { RedisClientService } from '@/services/redis/redis-client.service';
import { Logger } from '@/logger';
import config from '@/config';
import type { Redis as SingleNodeClient, Cluster as MultiNodeClient } from 'ioredis';
import type {
	RedisServiceCommandObject,
	RedisServiceWorkerResponseObject,
} from '@/services/redis/redis-service-commands';

/**
 * Responsible for publishing messages into the pub/sub channels used by scaling mode.
 */
@Service()
export class Publisher {
	private readonly client: SingleNodeClient | MultiNodeClient;

	// #region Lifecycle

	constructor(
		private readonly logger: Logger,
		private readonly redisClientService: RedisClientService,
	) {
		if (config.getEnv('executions.mode') !== 'queue') return;

		this.client = this.redisClientService.createClient({ type: 'publisher(n8n)' });

		this.client.on('error', (error) => this.logger.error(error.message));
	}

	shutdown() {
		this.client.disconnect();
	}

	// #endregion

	// #region Publishing

	/** Publish a command into the `n8n.commands` channel. */
	async publishCommand(msg: Omit<RedisServiceCommandObject, 'senderId'>) {
		await this.client.publish(
			'n8n.commands',
			JSON.stringify({ ...msg, senderId: config.getEnv('redis.queueModeId') }),
		);

		this.logger.debug(`Published ${msg.command} to command channel`);
	}

	/** Publish a response for a command into the `n8n.worker-response` channel. */
	async publishResponse(msg: RedisServiceWorkerResponseObject) {
		await this.client.publish('n8n.worker-response', JSON.stringify(msg));

		this.logger.debug(`Published response for ${msg.command} to worker response channel`);
	}

	// #endregion

	// #region Utils for multi-main setup

	async setIfNotExists(key: string, value: string) {
		const success = await this.client.setnx(key, value);

		return !!success;
	}

	async setExpiration(key: string, ttl: number) {
		await this.client.expire(key, ttl);
	}

	async get(key: string) {
		return await this.client.get(key);
	}

	async clear(key: string) {
		await this.client?.del(key);
	}

	// #endregion
}
