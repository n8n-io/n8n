import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent, type PubSubCommandMap } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { Publisher, Subscriber } from '@n8n/backend-services';

import { AgentClusterService } from './agent-cluster.service';

import type { initSseStream } from './agent-sse-stream';
import {
	AgentStreamChannel,
	type AgentStreamBatch,
	type AgentStreamEntry,
} from './queue/agent-stream-channel.service';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';

type QueueStreamEvent = PubSubCommandMap['relay-agent-queued-chat'];

@Service()
export class AgentQueuedTestStreamService {
	private static readonly RECOVERY_GRACE_MS = 10_000;
	private static readonly RELAY_HEARTBEAT_MS = 5_000;
	private static readonly RELAY_TIMEOUT_MS = 30_000;
	/** Deltas on the stream channel are batched for this long. */
	static readonly BATCH_WINDOW_MS = 50;
	/** A batch is sent early once it holds this many bytes. */
	private static readonly BATCH_MAX_BYTES = 256 * 1024;

	private readonly listeners = new Map<
		string,
		{
			accepted: boolean;
			sequence: number;
			recoveryDeadline?: number;
			relayDeadline?: number;
			lastEventAt: number;
			send: (event: AgentSseEvent) => void;
			close: () => void;
		}
	>();
	private readonly stopRelays = new Set<() => void>();

	constructor(
		private readonly publisher: Publisher,
		private readonly cluster: AgentClusterService,
		private readonly repository: AgentMessageQueueRepository,
		private readonly logger: Logger,
		subscriber: Subscriber,
		private readonly streamChannel: AgentStreamChannel,
	) {
		if (!this.cluster.shouldRelayAcrossProcesses()) return;
		const closeListeners = () => {
			for (const listener of this.listeners.values()) listener.close();
		};
		const stopRelays = () => {
			for (const stop of this.stopRelays) stop();
		};
		subscriber.getClient().on('close', closeListeners);
		this.publisher.getClient().on('close', stopRelays);
		if (!this.streamChannel.enabled) return;
		this.streamChannel.onPublisherClose(stopRelays);
		if (!this.cluster.isMain) return;
		this.streamChannel
			.subscribe(
				(batch) => this.handleBatch(batch),
				(queueId) => this.listeners.has(queueId),
			)
			.then(() => this.streamChannel.onSubscriberClose(closeListeners))
			.catch((error: unknown) => {
				this.logger.error('Failed to subscribe to the agent stream channel', { error });
			});
	}

	/** Attach the browser stream to a queue item. Disconnecting detaches delivery only. */
	subscribe(
		queueId: string,
		stream: Pick<ReturnType<typeof initSseStream>, 'send' | 'abortSignal' | 'close'>,
	) {
		const done = createDeferredPromise();
		const close = () => {
			this.listeners.delete(queueId);
			stream.abortSignal.removeEventListener('abort', close);
			stream.close();
			done.resolve();
		};
		const listener = {
			accepted: false,
			sequence: 0,
			lastEventAt: Date.now(),
			send: stream.send,
			close,
		};
		this.listeners.set(queueId, listener);
		stream.abortSignal.addEventListener('abort', close, { once: true });
		if (stream.abortSignal.aborted) close();
		return {
			done: done.promise,
			close,
			accepted: () => {
				listener.accepted = true;
			},
			/** Time of the last relayed event or heartbeat, to detect a lost producer. */
			lastEventAt: () => listener.lastEventAt,
		};
	}

	/** Close local browser connections for messages that will not run. */
	closeQueuedStreams(queueIds: string[]): void {
		for (const queueId of queueIds) this.listeners.get(queueId)?.close();
	}

	/** Forward events to the main with the browser stream. Heartbeats detect a lost relay. */
	createSender(queueId: string) {
		let sequence = 0;
		let pending = Promise.resolve();
		let failed = false;
		let heartbeat: NodeJS.Timeout | undefined;
		let batch: AgentStreamEntry[] = [];
		let batchStart = 0;
		let batchBytes = 0;
		let flushTimer: NodeJS.Timeout | undefined;
		const stopped = createDeferredPromise();
		const stop = () => {
			failed = true;
			clearInterval(heartbeat);
			clearTimeout(flushTimer);
			batch = [];
			this.listeners.get(queueId)?.close();
			stopped.resolve();
		};
		const relay = this.cluster.shouldRelayAcrossProcesses();
		const useChannel = relay && this.streamChannel.enabled;
		if (relay) {
			this.stopRelays.add(stop);
			const ready = useChannel
				? this.streamChannel.publisherReady
				: this.publisher.getClient().status === 'ready';
			if (!ready) stop();
		}
		const flush = () => {
			clearTimeout(flushTimer);
			flushTimer = undefined;
			if (batch.length === 0) return;
			const message: AgentStreamBatch = { queueId, sequence: batchStart, entries: batch };
			batch = [];
			batchBytes = 0;
			pending = pending
				.then(async () => await this.streamChannel.publish(message))
				.catch((error: unknown) => {
					stop();
					this.logger.warn('Failed to relay queued agent output', { queueId, error });
				});
		};
		const enqueue = (payload: QueueStreamEvent) => {
			const entry: AgentStreamEntry =
				payload.event === null ? { end: true } : payload.event ? { event: payload.event } : {};
			if (batch.length === 0) batchStart = payload.sequence;
			batch.push(entry);
			batchBytes += entry.event ? Buffer.byteLength(JSON.stringify(entry.event)) : 2;
			if (payload.event === null || batchBytes >= AgentQueuedTestStreamService.BATCH_MAX_BYTES) {
				flush();
				return;
			}
			flushTimer ??= setTimeout(flush, AgentQueuedTestStreamService.BATCH_WINDOW_MS);
		};
		const send = (event: QueueStreamEvent['event']) => {
			if (failed) return;
			let payload: QueueStreamEvent = { queueId, sequence: ++sequence, event };
			if (relay && !this.cluster.fitsInPubSubMessage(payload)) {
				// An oversized event cannot cross processes. End the stream so that the
				// client reads the recorded history instead.
				this.logger.warn('Ended a queued agent stream because an event is too large to relay', {
					queueId,
				});
				this.cluster.metrics.record({ type: 'relay-dropped', channel: 'stream' });
				payload = { queueId, sequence, event: null };
				failed = true;
				clearInterval(heartbeat);
			}
			this.handleRelay(payload);
			if (!relay) return;
			if (useChannel) {
				if (!failed || payload.event === null) enqueue(payload);
				return;
			}
			pending = pending
				.then(async () => {
					if (!failed || payload.event === null)
						await this.publisher.publishCommand({ command: 'relay-agent-queued-chat', payload });
				})
				.catch((error: unknown) => {
					stop();
					this.logger.warn('Failed to relay queued agent output', { queueId, error });
				});
		};
		if (relay && !failed) {
			heartbeat = setInterval(
				() => send(undefined),
				AgentQueuedTestStreamService.RELAY_HEARTBEAT_MS,
			);
			heartbeat.unref();
		}
		return {
			send: (event: AgentSseEvent) => send(event),
			close: async () => {
				clearInterval(heartbeat);
				send(null);
				// Redis can retain an in-flight publish while disconnected. It must not stall the queue.
				await Promise.race([pending, stopped.promise]);
				this.stopRelays.delete(stop);
			},
		};
	}

	/** Forward relayed events to the browser. Close on a missing event so the client can load history. */
	@OnPubSubEvent('relay-agent-queued-chat', { instanceType: 'main' })
	handleRelay({ queueId, sequence, event }: QueueStreamEvent): void {
		const listener = this.listeners.get(queueId);
		if (!listener || sequence <= listener.sequence) return;
		if (sequence !== listener.sequence + 1 || event === null) {
			listener.close();
			return;
		}
		listener.sequence = sequence;
		listener.lastEventAt = Date.now();
		listener.recoveryDeadline = undefined;
		listener.relayDeadline = Date.now() + AgentQueuedTestStreamService.RELAY_TIMEOUT_MS;
		if (event !== undefined) listener.send(event);
	}

	/** Expand a batch from the stream channel into single relayed events. */
	handleBatch({ queueId, sequence, entries }: AgentStreamBatch): void {
		for (const [index, entry] of entries.entries()) {
			this.handleRelay({
				queueId,
				sequence: sequence + index,
				event: entry.end ? null : entry.event,
			});
		}
	}

	/** A lost producer cannot send EOF. Let the client recover from recorded history. */
	async closeSettledStreams(): Promise<void> {
		for (const [id, listener] of this.listeners) {
			if (!listener.accepted) continue;
			const item = await this.repository.findDeliveryState(id);
			if (item && (!item.execution || item.execution.status === 'running')) {
				listener.recoveryDeadline = undefined;
				if (item.execution && this.cluster.shouldRelayAcrossProcesses()) {
					listener.relayDeadline ??= Date.now() + AgentQueuedTestStreamService.RELAY_TIMEOUT_MS;
					if (Date.now() >= listener.relayDeadline) listener.close();
				}
				continue;
			}
			// Allow final relay events to arrive after database settlement.
			listener.recoveryDeadline ??= Date.now() + AgentQueuedTestStreamService.RECOVERY_GRACE_MS;
			if (Date.now() >= listener.recoveryDeadline) listener.close();
		}
	}
}
