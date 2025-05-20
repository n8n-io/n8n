import { Service } from '@n8n/di';
import type { Redis as SingleNodeClient, Cluster as MultiNodeClient } from 'ioredis';
import { InstanceSettings, Logger } from 'n8n-core';
import type { LogMetadata } from 'n8n-workflow';

import config from '@/config';
import { RedisClientService } from '@/services/redis-client.service';

import type { PubSub } from './pubsub.types';
import { IMMEDIATE_COMMANDS, SELF_SEND_COMMANDS } from '../constants';

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
		private readonly instanceSettings: InstanceSettings,
	) {
		// @TODO: Once this class is only ever initialized in scaling mode, assert in the next line.
		if (config.getEnv('executions.mode') !== 'queue') return;

		this.logger = this.logger.scoped(['scaling', 'pubsub']);

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
	async publishCommand(msg: PubSub.Command) {
		// @TODO: Once this class is only ever used in scaling mode, remove next line.
		if (config.getEnv('executions.mode') !== 'queue') return;

		await this.client.publish(
			'n8n.commands',
			JSON.stringify({
				...msg,
				senderId: this.instanceSettings.hostId,
				selfSend: SELF_SEND_COMMANDS.has(msg.command),
				debounce: !IMMEDIATE_COMMANDS.has(msg.command),
			}),
		);

		let msgName = msg.command;

		const metadata: LogMetadata = { msg: msg.command, channel: 'n8n.commands' };

		if (msg.command === 'relay-execution-lifecycle-event') {
			const { data, type } = msg.payload;
			msgName += ` (${type})`;
			metadata.type = type;
			if ('executionId' in data) metadata.executionId = data.executionId;
		}

		this.logger.debug(`Published pubsub msg: ${msgName}`, metadata);
	}

	/** Publish a response to a command into the `n8n.worker-response` channel. */
	async publishWorkerResponse(msg: PubSub.WorkerResponse) {
		await this.client.publish('n8n.worker-response', JSON.stringify(msg));

		this.logger.debug(`Published ${msg.response} to worker response channel`);
	}

	// #endregion

	// #region Utils for multi-main setup

	// @TODO: The following methods are not pubsub-specific. Consider a dedicated client for multi-main setup.

	async setIfNotExists(key: string, value: string, ttl: number) {
		const result = await this.client.set(key, value, 'EX', ttl, 'NX');
		return result === 'OK';
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
