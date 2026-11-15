import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig, GlobalConfig } from '@n8n/config';
import { OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { Cluster, Redis } from 'ioredis';
import { jsonParse } from 'n8n-workflow';

import { AgentClusterService } from '../agent-cluster.service';

const AGENT_STREAM_CHANNEL = 'n8n.agent-stream';

/**
 * One relayed stream entry. An empty entry is a heartbeat, `end` closes the
 * stream. JSON drops `undefined` in arrays, so entries are objects.
 */
export type AgentStreamEntry = { event?: AgentSseEvent; end?: true };

/** A batch of consecutive entries. `sequence` is the sequence of the first entry. */
export interface AgentStreamBatch {
	queueId: string;
	sequence: number;
	entries: AgentStreamEntry[];
}

/**
 * Dedicated Redis channel for queued agent chat streams.
 *
 * Streams are much louder than commands, so they do not share the command
 * channel that every process reads. Workers that run agent turns publish here,
 * and only mains with agent queue mode subscribe.
 *
 * Every subscribed main receives every batch. A message starts with the queue
 * ID and a line break, so that a main parses only the batches of its own
 * browser streams.
 */
@Service()
export class AgentStreamChannel {
	private publisher?: Redis | Cluster;

	private subscriber?: Redis | Cluster;

	private handler?: (batch: AgentStreamBatch) => void;

	private readonly channel: string;

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly cluster: AgentClusterService,
		globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		this.channel = `${globalConfig.redis.prefix}:${AGENT_STREAM_CHANNEL}`;
	}

	/**
	 * True when streams use this channel. Mains with agent queue mode read it,
	 * so every process that can run a turn for them writes to it.
	 */
	get enabled(): boolean {
		if (!this.cluster.shouldRelayAcrossProcesses()) return false;
		return this.cluster.isWorker
			? this.agentsConfig.workerEnabled
			: this.agentsConfig.queueModeEnabled;
	}

	/** Subscribe on a main. Each batch of a queue ID that `wants` accepts goes to `handler`. */
	async subscribe(
		handler: (batch: AgentStreamBatch) => void,
		wants: (queueId: string) => boolean,
	): Promise<void> {
		if (!this.enabled || !this.cluster.isMain || this.subscriber) return;
		this.handler = handler;
		const client = await this.createClient();
		this.subscriber = client;
		client.on('message', (channel: string, message: string) => {
			if (channel !== this.channel) return;
			const split = message.indexOf('\n');
			if (split < 0 || !wants(message.slice(0, split))) return;
			const batch = jsonParse<AgentStreamBatch | null>(message.slice(split + 1), {
				fallbackValue: null,
			});
			if (!batch || typeof batch.queueId !== 'string' || !Array.isArray(batch.entries)) return;
			this.handler?.(batch);
		});
		// ioredis replays SUBSCRIBE on reconnect.
		await client.subscribe(this.channel);
	}

	async publish(batch: AgentStreamBatch): Promise<void> {
		this.publisher ??= await this.createClient();
		await this.publisher.publish(this.channel, `${batch.queueId}\n${JSON.stringify(batch)}`);
	}

	/** False when the publish connection is down, so a stream should not start. */
	get publisherReady(): boolean {
		return this.publisher === undefined || this.publisher.status === 'ready';
	}

	onPublisherClose(listener: () => void): void {
		void this.ensurePublisher().then((client) => client.on('close', listener));
	}

	onSubscriberClose(listener: () => void): void {
		this.subscriber?.on('close', listener);
	}

	@OnShutdown()
	async shutdown(): Promise<void> {
		for (const client of [this.subscriber, this.publisher]) {
			try {
				client?.disconnect();
			} catch (error) {
				this.logger.debug('Failed to close an agent stream connection', { error });
			}
		}
		this.subscriber = undefined;
		this.publisher = undefined;
	}

	private async ensurePublisher(): Promise<Redis | Cluster> {
		this.publisher ??= await this.createClient();
		return this.publisher;
	}

	private async createClient(): Promise<Redis | Cluster> {
		const { RedisClientService } = await import('@n8n/backend-services');
		return Container.get(RedisClientService).createClient({ type: 'agent-stream(n8n)' });
	}
}
