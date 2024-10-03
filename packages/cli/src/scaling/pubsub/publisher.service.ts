import type { Redis as SingleNodeClient, Cluster as MultiNodeClient } from 'ioredis';
import { Service } from 'typedi';

import config from '@/config';
import { Logger } from '@/logging/logger.service';
import { RedisClientService } from '@/services/redis-client.service';

import type { PubSub } from './pubsub.types';

/**
 * Responsible for publishing messages into the pubsub channels used by scaling mode.
 */
@Service()
export class Publisher {
	private readonly client: SingleNodeClient | MultiNodeClient;

	// #region Lifecycle

	constructor(
		private readonly logger: Logger,
		private readonly redisClientService: RedisClientService,
	) {
		// @TODO: Once this class is only ever initialized in scaling mode, throw in the next line instead.
		if (config.getEnv('executions.mode') !== 'queue') return;

		this.client = this.redisClientService.createClient({ type: 'publisher(n8n)' });
	}

	getClient() {
		return this.client;
	}

	// @TODO: Use `@OnShutdown()` decorator
	shutdown() {
		this.client.disconnect();
	}

	// #endregion

	// #region Publishing

	/** Publish a command into the `n8n.commands` channel. */
	async publishCommand(msg: Omit<PubSub.Command, 'senderId'>) {
		await this.client.publish(
			'n8n.commands',
			JSON.stringify({ ...msg, senderId: config.getEnv('redis.queueModeId') }),
		);

		this.logger.debug(`Published ${msg.command} to command channel`);
	}

	/** Publish a response for a command into the `n8n.worker-response` channel. */
	async publishWorkerResponse(msg: PubSub.WorkerResponse) {
		await this.client.publish('n8n.worker-response', JSON.stringify(msg));

		this.logger.debug(`Published response for ${msg.command} to worker response channel`);
	}

	// #endregion

	// #region Utils for multi-main setup

	// @TODO: The following methods are not pubsub-specific. Consider a dedicated client for multi-main setup.

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
