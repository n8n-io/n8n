import type { InstanceAiEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { InstanceAiEventBus, StoredEvent } from '@n8n/instance-ai';
import { InstanceSettings } from 'n8n-core';
import { EventEmitter } from 'node:events';

import { MAX_PUBSUB_PAYLOAD_BYTES } from '@/scaling/constants';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { DurableEventLog, type DrainedEvent } from './durable-event-log';

/**
 * Live fan-out for Instance AI events. `instance_ai_events` is the source of
 * truth: this bus persists nothing and reads nothing back. Every replay and
 * run-scoped read goes to {@link DurableEventLog}, so all this owns is the
 * local SSE emitter and the cross-main relay.
 */
@Service()
export class InProcessEventBus implements InstanceAiEventBus {
	private readonly emitter = new EventEmitter();

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly eventLog: DurableEventLog,
	) {
		this.logger = this.logger.scoped('instance-ai');
		// Avoid warnings when many SSE clients connect (each adds a listener per thread)
		this.emitter.setMaxListeners(0);
	}

	/**
	 * Publish an event for a thread: a synchronous enqueue into the durable
	 * log's per-thread drain, which assigns `seq` from the DB, persists durable
	 * facts, and hands each event back here ({@link onDrained}) for fan-out.
	 *
	 * Ephemeral events (deltas, status) carry NO id, so their SSE frames have no
	 * `id:` line and the browser's replay cursor only ever points at durable
	 * facts.
	 */
	publish(threadId: string, event: InstanceAiEvent): void {
		// Stamp publish time once — replays (SSE reconnect, history folds)
		// rely on it to reconstruct real timing instead of processing time, and
		// persisted events must carry it too.
		if (event.ts === undefined) {
			event = { ...event, ts: Date.now() };
		}
		this.eventLog.publish(threadId, event, (drained) => this.onDrained(threadId, drained));
	}

	/**
	 * An event handed back by the durable log's drain: fan it out to local SSE
	 * subscribers and sibling mains. Coalesced blocks are durable but NOT live
	 * (subscribers already saw their deltas), so they fan out to nobody.
	 */
	private onDrained(threadId: string, drained: DrainedEvent): void {
		if (!drained.live) return;
		const stored: StoredEvent = {
			...(drained.id !== undefined ? { id: drained.id } : {}),
			event: drained.event,
		};
		this.emitter.emit(threadId, stored);
		this.relayToSiblings(
			threadId,
			stored,
			Buffer.byteLength(JSON.stringify(drained.event), 'utf8'),
		);
	}

	private relayToSiblings(threadId: string, stored: StoredEvent, sizeBytes: number): void {
		if (!this.instanceSettings.isMultiMain) return;

		if (sizeBytes > MAX_PUBSUB_PAYLOAD_BYTES) {
			this.logger.warn(
				`Skipping cross-main relay of "${stored.event.type}" event (${sizeBytes} bytes exceeds ${MAX_PUBSUB_PAYLOAD_BYTES})`,
				{ threadId, runId: stored.event.runId },
			);
			return;
		}

		void this.publisher
			.publishCommand({
				command: 'relay-instance-ai-event',
				payload: { threadId, storedEvent: stored },
			})
			.catch((error: unknown) =>
				this.logger.error('Failed to relay Instance AI event to sibling mains', {
					threadId,
					error,
				}),
			);
	}

	/**
	 * A relayed event from another main, carrying its DB-assigned seq (id-less =
	 * ephemeral, live-only). Pure live delivery: reconnect replay reads the log,
	 * so a relayed frame is only ever needed by a subscriber attached right now,
	 * and a frame delivered twice is dropped client-side by its id.
	 */
	@OnPubSubEvent('relay-instance-ai-event', { instanceType: 'main' })
	handleRelayInstanceAiEvent({
		threadId,
		storedEvent,
	}: { threadId: string; storedEvent: StoredEvent }): void {
		if (this.hasSubscribers(threadId)) this.emitter.emit(threadId, storedEvent);
	}

	subscribe(threadId: string, handler: (storedEvent: StoredEvent) => void): () => void {
		this.emitter.on(threadId, handler);
		return () => this.emitter.off(threadId, handler);
	}

	/** Whether this main currently holds an SSE subscription for the thread. */
	hasSubscribers(threadId: string): boolean {
		return this.emitter.listenerCount(threadId) > 0;
	}

	/** Drop a thread's live state (e.g. on thread deletion or expiration). */
	clearThread(threadId: string): void {
		this.eventLog.clearThread(threadId);
		this.emitter.removeAllListeners(threadId);
	}

	/** Drop every thread's live state. Used during module shutdown. */
	clear(): void {
		this.eventLog.clear();
		this.emitter.removeAllListeners();
	}
}
