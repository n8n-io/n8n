import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig, GlobalConfig } from '@n8n/config';
import { OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { Cluster, Redis } from 'ioredis';
import { jsonParse } from 'n8n-workflow';

import { AgentClusterService } from '../agent-cluster.service';

const AGENT_STREAM_CHANNEL = 'n8n.agent-stream';

const AGENT_TURN_CONTROL_CHANNEL = 'n8n.agent-turn-control';

/** A message on the control channel. Workers read it to stop a turn that they run. */
interface AgentTurnControlMessage {
	type: 'cancel';
	turnId: string;
}

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
 * The shared channel carries the streams of queued chat messages. Every
 * subscribed main receives every batch. A message starts with the queue ID and
 * a line break, so that a main parses only the batches of its own browser
 * streams.
 *
 * A key channel (`<prefix>:n8n.agent-stream:<key>`) carries the entries of one
 * agent turn. Only the process that listens to the key receives them.
 *
 * The control channel tells workers to stop a turn.
 *
 * One subscriber connection serves all channels of a process.
 */
@Service()
export class AgentStreamChannel {
	private publisher?: Redis | Cluster;

	/** Set on the first publish, so concurrent publishes share one client. */
	private publisherPromise?: Promise<Redis | Cluster>;

	private subscriber?: Redis | Cluster;

	/** Set on the first subscribe, so concurrent subscribes share one client. */
	private subscriberPromise?: Promise<Redis | Cluster>;

	private readonly channel: string;

	private readonly controlChannel: string;

	/** Handlers of the channels that this process reads, by channel name. */
	private readonly handlers = new Map<string, (message: string) => void>();

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly cluster: AgentClusterService,
		globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		this.channel = `${globalConfig.redis.prefix}:${AGENT_STREAM_CHANNEL}`;
		this.controlChannel = `${globalConfig.redis.prefix}:${AGENT_TURN_CONTROL_CHANNEL}`;
	}

	private keyChannel(key: string): string {
		return `${this.channel}:${key}`;
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
		if (!this.enabled || !this.cluster.isMain || this.handlers.has(this.channel)) return;
		await this.listenTo(this.channel, (message) => {
			const split = message.indexOf('\n');
			if (split < 0 || !wants(message.slice(0, split))) return;
			const batch = jsonParse<AgentStreamBatch | null>(message.slice(split + 1), {
				fallbackValue: null,
			});
			if (!batch || typeof batch.queueId !== 'string' || !Array.isArray(batch.entries)) return;
			handler(batch);
		});
	}

	/**
	 * Read the channel of one key. Resolves once Redis confirms the
	 * subscription, so a message published after that arrives. Returns a
	 * function that stops the read.
	 */
	async listen(key: string, handler: (message: string) => void): Promise<() => Promise<void>> {
		const channel = this.keyChannel(key);
		await this.listenTo(channel, handler);
		return async () => await this.unlistenFrom(channel);
	}

	/** Send a message to the process that listens to `key`. */
	async publishTo(key: string, message: string): Promise<void> {
		const publisher = await this.ensurePublisher();
		await publisher.publish(this.keyChannel(key), message);
	}

	/** Read the requests to stop a turn. A worker calls this once. */
	async onCancel(handler: (turnId: string) => void): Promise<void> {
		await this.listenTo(this.controlChannel, (message) => {
			const control = jsonParse<AgentTurnControlMessage | null>(message, { fallbackValue: null });
			if (control?.type === 'cancel' && typeof control.turnId === 'string') {
				handler(control.turnId);
			}
		});
	}

	/** Tell every worker to stop a turn. The worker that runs it stops it. */
	async cancel(turnId: string): Promise<void> {
		const message: AgentTurnControlMessage = { type: 'cancel', turnId };
		const publisher = await this.ensurePublisher();
		await publisher.publish(this.controlChannel, JSON.stringify(message));
	}

	private async listenTo(channel: string, handler: (message: string) => void): Promise<void> {
		this.handlers.set(channel, handler);
		try {
			const client = await this.ensureSubscriber();
			// ioredis replays SUBSCRIBE on reconnect.
			await client.subscribe(channel);
		} catch (error) {
			this.handlers.delete(channel);
			throw error;
		}
	}

	private async unlistenFrom(channel: string): Promise<void> {
		if (!this.handlers.delete(channel)) return;
		try {
			await this.subscriber?.unsubscribe(channel);
		} catch (error) {
			this.logger.debug('Failed to stop reading an agent stream channel', { channel, error });
		}
	}

	private async ensureSubscriber(): Promise<Redis | Cluster> {
		this.subscriberPromise ??= this.createClient().then(
			(client) => {
				this.subscriber = client;
				client.on('message', (channel: string, message: string) => {
					this.handlers.get(channel)?.(message);
				});
				return client;
			},
			(error: unknown) => {
				this.subscriberPromise = undefined;
				throw error;
			},
		);
		return await this.subscriberPromise;
	}

	async publish(batch: AgentStreamBatch): Promise<void> {
		const publisher = await this.ensurePublisher();
		await publisher.publish(this.channel, `${batch.queueId}\n${JSON.stringify(batch)}`);
	}

	/** False when the publish connection is down, so a stream should not start. */
	get publisherReady(): boolean {
		return this.publisher === undefined || this.publisher.status === 'ready';
	}

	onPublisherClose(listener: () => void): void {
		this.ensurePublisher()
			.then((client) => client.on('close', listener))
			.catch((error: unknown) => {
				this.logger.warn('Failed to open the agent stream publish connection', { error });
			});
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
		this.subscriberPromise = undefined;
		this.handlers.clear();
		this.publisher = undefined;
		this.publisherPromise = undefined;
	}

	private async ensurePublisher(): Promise<Redis | Cluster> {
		this.publisherPromise ??= this.createClient().then(
			(client) => {
				this.publisher = client;
				return client;
			},
			(error: unknown) => {
				// Let the next publish try again.
				this.publisherPromise = undefined;
				throw error;
			},
		);
		return await this.publisherPromise;
	}

	private async createClient(): Promise<Redis | Cluster> {
		const { RedisClientService } = await import('@n8n/backend-services');
		return Container.get(RedisClientService).createClient({ type: 'agent-stream(n8n)' });
	}
}
