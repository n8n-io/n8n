import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Redis as SingleNodeClient, Cluster as MultiNodeClient } from 'ioredis';
import { InstanceSettings } from 'n8n-core';
import type { LogMetadata } from 'n8n-workflow';

import { RedisClientService } from '@/services/redis-client.service';

import type { PubSub } from './pubsub.types';
import {
	COMMAND_PUBSUB_CHANNEL,
	IMMEDIATE_COMMANDS,
	SELF_SEND_COMMANDS,
	WORKER_RESPONSE_PUBSUB_CHANNEL,
} from '../constants';

/**
 * Responsible for publishing messages into the pubsub channels used by scaling mode.
 */
@Service()
export class Publisher {
	private readonly client: SingleNodeClient | MultiNodeClient;

	private readonly commandChannel: string;

	private readonly workerResponseChannel: string;

	// #region Lifecycle

	constructor(
		private readonly logger: Logger,
		private readonly redisClientService: RedisClientService,
		private readonly instanceSettings: InstanceSettings,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly globalConfig: GlobalConfig,
	) {
		// @TODO: Once this class is only ever initialized in scaling mode, assert in the next line.
		if (this.executionsConfig.mode !== 'queue') return;

		this.logger = this.logger.scoped(['scaling', 'pubsub']);

		// Build prefixed channel names for proper isolation between deployments
		const prefix = this.globalConfig.redis.prefix;
		this.commandChannel = `${prefix}:${COMMAND_PUBSUB_CHANNEL}`;
		this.workerResponseChannel = `${prefix}:${WORKER_RESPONSE_PUBSUB_CHANNEL}`;

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

	/** Publish a command into the commands channel. */
	async publishCommand(msg: PubSub.Command) {
		// @TODO: Once this class is only ever used in scaling mode, remove next line.
		if (this.executionsConfig.mode !== 'queue') return;

		await this.client.publish(
			this.commandChannel,
			JSON.stringify({
				...msg,
				senderId: this.instanceSettings.hostId,
				selfSend: SELF_SEND_COMMANDS.has(msg.command),
				debounce: !IMMEDIATE_COMMANDS.has(msg.command),
			}),
		);

		let msgName = msg.command;

		const metadata: LogMetadata = { msg: msg.command, channel: this.commandChannel };

		if (msg.command === 'relay-execution-lifecycle-event') {
			const { data, type } = msg.payload;
			msgName += ` (${type})`;
			metadata.type = type;
			if ('executionId' in data) metadata.executionId = data.executionId;
		}

		this.logger.debug(`Published pubsub msg: ${msgName}`, metadata);
	}

	/** Publish a response to a command into the worker response channel. */
	async publishWorkerResponse(msg: PubSub.WorkerResponse) {
		await this.client.publish(this.workerResponseChannel, JSON.stringify(msg));

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
