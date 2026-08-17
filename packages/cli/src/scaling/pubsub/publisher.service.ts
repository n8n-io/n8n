import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import type { Redis as SingleNodeClient, Cluster as MultiNodeClient } from 'ioredis';
import { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';
import type { LogMetadata } from 'n8n-workflow';

import { TransportModeService } from '@/scaling/transport-mode.service';
import { RedisClientService } from '@/services/redis-client.service';

import type { PubSub } from './pubsub.types';
import {
	COMMAND_PUBSUB_CHANNEL,
	IMMEDIATE_COMMANDS,
	SELF_SEND_COMMANDS,
	WORKER_RESPONSE_PUBSUB_CHANNEL,
	MCP_RELAY_PUBSUB_CHANNEL,
} from '../constants';
import type { McpRelayMessage } from './subscriber.service';
import { MessageTransportService } from '../transport/message-transport.service';

/**
 * Responsible for publishing messages into the pubsub channels used by scaling mode.
 */
@Service()
export class Publisher {
	/** Used only by the key-value utils below, never for pubsub - see that region. */
	private readonly redisClient?: SingleNodeClient | MultiNodeClient;

	private readonly commandChannel: string;

	private readonly workerResponseChannel: string;

	private readonly mcpRelayChannel: string;

	// #region Lifecycle

	constructor(
		private readonly logger: Logger,
		private readonly redisClientService: RedisClientService,
		private readonly messageTransport: MessageTransportService,
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
		this.mcpRelayChannel = `${prefix}:${MCP_RELAY_PUBSUB_CHANNEL}`;

		// This client backs only the key-value utils below, which are Redis-only.
		// Hypervisor children have no Redis; their KV consumers are guarded off
		// until the KV facet lands on the hypervisor channel.
		if (!Container.get(TransportModeService).isUnderHypervisor()) {
			this.redisClient = this.redisClientService.createClient({ type: 'publisher(n8n)' });
		}
	}

	getClient() {
		// Only reached in multi-main, which implies Redis is configured.
		return this.kvClient;
	}

	// @TODO: Use `@OnShutdown()` decorator
	shutdown() {
		this.redisClient?.disconnect();
	}

	// #endregion

	// #region Publishing

	/** Publish a command into the commands channel. */
	async publishCommand(msg: PubSub.Command) {
		// @TODO: Once this class is only ever used in scaling mode, remove next line.
		if (this.executionsConfig.mode !== 'queue') return;

		await this.messageTransport.publish(
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
		await this.messageTransport.publish(this.workerResponseChannel, JSON.stringify(msg));

		this.logger.debug(`Published ${msg.response} to worker response channel`);
	}

	/** Publish an MCP relay message to route responses between main instances. */
	async publishMcpRelay(msg: McpRelayMessage) {
		// @TODO: Once this class is only ever used in scaling mode, remove next line.
		if (this.executionsConfig.mode !== 'queue') return;

		await this.messageTransport.publish(this.mcpRelayChannel, JSON.stringify(msg));

		this.logger.debug('Published MCP relay message', {
			sessionId: msg.sessionId,
			messageId: msg.messageId,
			channel: this.mcpRelayChannel,
		});
	}

	// #endregion

	// #region Key-value utils (used by MCP session store and legacy leader election)
	//
	// Not part of the messaging facet abstracted above - these are a storage-facet
	// concern (per the RFC's messaging/storage split) and stay directly on Redis.
	// Consumers must not call these under the hypervisor (no Redis there).

	private get kvClient() {
		if (!this.redisClient) {
			throw new OperationalError('Key-value utils require Redis, which hypervisor children lack');
		}
		return this.redisClient;
	}

	async setIfNotExists(key: string, value: string, ttl: number) {
		const result = await this.kvClient.set(key, value, 'EX', ttl, 'NX');
		return result === 'OK';
	}

	async set(key: string, value: string, ttl: number) {
		await this.kvClient.set(key, value, 'EX', ttl);
	}

	async setExpiration(key: string, ttl: number) {
		await this.kvClient.expire(key, ttl);
	}

	async get(key: string) {
		return await this.kvClient.get(key);
	}

	async clear(key: string) {
		await this.redisClient?.del(key);
	}

	// #endregion
}
