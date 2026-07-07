import type { InstanceAiEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { InstanceAiEventBus, StoredEvent } from '@n8n/instance-ai';
import { InstanceSettings } from 'n8n-core';
import { EventEmitter } from 'node:events';

import { MAX_PUBSUB_PAYLOAD_BYTES } from '@/scaling/constants';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { DurableEventLog, type DrainedEvent } from './durable-event-log';

// With the durable log ON, the in-memory store is a live-delivery CACHE over
// instance_ai_events, not the source of truth: eviction bounds the cache and
// can no longer lose data (replay reads the DB through DurableEventLog).
// With the flag OFF it is today's only store, and eviction is data loss.
const MAX_EVENTS_PER_THREAD = 500;
const MAX_BYTES_PER_THREAD = 2 * 1024 * 1024; // 2 MB

@Service()
export class InProcessEventBus implements InstanceAiEventBus {
	private readonly emitter = new EventEmitter();

	private readonly store = new Map<string, StoredEvent[]>();

	/** Approximate serialized size per thread for eviction. */
	private readonly sizeBytes = new Map<string, number>();

	/** Legacy path (flag off): monotonic counter per thread — never resets even
	 *  after eviction, but does reset on process restart. */
	private readonly nextId = new Map<string, number>();

	private readonly durableLogEnabled: boolean;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly eventLog: DurableEventLog,
		globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped('instance-ai');
		this.durableLogEnabled = globalConfig.instanceAi.durableLog;
		// Avoid warnings when many SSE clients connect (each adds a listener per thread)
		this.emitter.setMaxListeners(0);
	}

	/**
	 * Publish an event for a thread.
	 *
	 * Flag OFF (default): store it in memory, deliver it to local SSE
	 * subscribers, and — in multi-main — relay it to sibling mains so the main
	 * holding the client's SSE connection (which may not be this one) delivers it.
	 *
	 * Flag ON: synchronous enqueue into the durable log's per-thread drain,
	 * which assigns `seq` from the DB, persists durable facts, and hands each
	 * event back here: durable ones enter the cache; live ones go to local SSE
	 * subscribers and — in multi-main — to sibling mains via the pubsub relay.
	 * Ephemeral events (deltas, status) carry NO id, so SSE frames have no
	 * `id:` line and the browser's replay cursor only ever points at durable facts.
	 */
	publish(threadId: string, event: InstanceAiEvent): void {
		if (this.durableLogEnabled) {
			this.eventLog.publish(threadId, event, (drained) => this.onDrained(threadId, drained));
			return;
		}
		// Serialize once: reused for the store's size accounting and the relay guard.
		const sizeBytes = Buffer.byteLength(JSON.stringify(event), 'utf8');
		this.storeAndEmit(threadId, event, sizeBytes);
		this.relayToSiblings(threadId, event, sizeBytes);
	}

	/**
	 * Store + deliver locally WITHOUT relaying. Used by the pubsub handler when a
	 * relayed event arrives from another main — re-relaying would loop. The local
	 * `nextId` stamps the SSE id, so this main is the id authority for the
	 * connection it serves.
	 */
	publishLocalOnly(threadId: string, event: InstanceAiEvent): void {
		this.storeAndEmit(threadId, event, Buffer.byteLength(JSON.stringify(event), 'utf8'));
	}

	private storeAndEmit(threadId: string, event: InstanceAiEvent, eventSizeBytes: number): void {
		const events = this.getOrCreateStore(threadId);
		const id = (this.nextId.get(threadId) ?? 0) + 1;
		this.nextId.set(threadId, id);

		const stored: StoredEvent = { id, event };

		events.push(stored);
		this.sizeBytes.set(threadId, (this.sizeBytes.get(threadId) ?? 0) + eventSizeBytes);

		// Evict oldest events if count or size exceeds caps
		this.evictIfNeeded(threadId, events);

		this.emitter.emit(threadId, stored);
	}

	/**
	 * A relayed event from another main: deliver to this main's SSE clients only
	 * if it actually holds a subscription for the thread (avoids every main
	 * buffering every thread).
	 *
	 * Flag OFF: re-emit through the local store, so the local `nextId` stamps
	 * the SSE id and this main is the id authority for the connection it serves.
	 *
	 * Flag ON: emit WITHOUT an id — the durable seq lives in the shared DB, so a
	 * sibling's client replays correctly from DurableEventLog on reconnect
	 * regardless of which main it lands on; the per-main id-authority problem
	 * does not exist with a DB-backed log. Once #33558's relay payload carries
	 * the produced StoredEvent, the seq can pass through so sibling live frames
	 * advance cursors too.
	 */
	@OnPubSubEvent('relay-instance-ai-event', { instanceType: 'main' })
	handleRelayInstanceAiEvent({
		threadId,
		event,
	}: { threadId: string; event: InstanceAiEvent }): void {
		if (!this.hasSubscribers(threadId)) return;
		if (this.durableLogEnabled) {
			this.emitter.emit(threadId, { event } satisfies StoredEvent);
			return;
		}
		this.publishLocalOnly(threadId, event);
	}

	subscribe(threadId: string, handler: (storedEvent: StoredEvent) => void): () => void {
		this.emitter.on(threadId, handler);
		return () => this.emitter.off(threadId, handler);
	}

	/** Whether this main currently holds an SSE subscription for the thread. */
	hasSubscribers(threadId: string): boolean {
		return this.emitter.listenerCount(threadId) > 0;
	}

	/**
	 * Flag OFF: the only replay source. Flag ON: cache-scoped read for
	 * same-process consumers; cross-restart/cross-main replay must use
	 * DurableEventLog.getEventsAfter.
	 */
	getEventsAfter(threadId: string, afterId: number): StoredEvent[] {
		const events = this.store.get(threadId);
		if (!events) return [];
		return events.filter((e) => e.id !== undefined && e.id > afterId);
	}

	getEventsForRun(threadId: string, runId: string): InstanceAiEvent[] {
		const events = this.store.get(threadId);
		if (!events) return [];
		return events.filter((e) => e.event.runId === runId).map((e) => e.event);
	}

	getEventsForRuns(threadId: string, runIds: string[]): InstanceAiEvent[] {
		const events = this.store.get(threadId);
		if (!events || runIds.length === 0) return [];
		const runIdSet = new Set(runIds);
		return events.filter((e) => runIdSet.has(e.event.runId)).map((e) => e.event);
	}

	/** Flag ON: cache-scoped; the durable authority is DurableEventLog.getNextEventId. */
	getNextEventId(threadId: string): number {
		if (this.durableLogEnabled) {
			const events = this.store.get(threadId);
			const last = events?.length ? events[events.length - 1].id : undefined;
			return (last ?? 0) + 1;
		}
		return (this.nextId.get(threadId) ?? 0) + 1;
	}

	/** Clear stored events for a specific thread (e.g. on thread expiration). */
	clearThread(threadId: string): void {
		this.store.delete(threadId);
		this.sizeBytes.delete(threadId);
		this.nextId.delete(threadId);
		this.eventLog.clearThread(threadId);
		this.emitter.removeAllListeners(threadId);
	}

	/** Clear all stored events. Used during module shutdown. */
	clear(): void {
		this.store.clear();
		this.sizeBytes.clear();
		this.nextId.clear();
		this.eventLog.clear();
		this.emitter.removeAllListeners();
	}

	private onDrained(threadId: string, drained: DrainedEvent): void {
		const stored: StoredEvent = { id: drained.id, event: drained.event };
		if (drained.id !== undefined) {
			const events = this.getOrCreateStore(threadId);
			events.push(stored);
			this.sizeBytes.set(
				threadId,
				(this.sizeBytes.get(threadId) ?? 0) + Buffer.byteLength(JSON.stringify(drained.event), 'utf8'),
			);
			this.evictIfNeeded(threadId, events);
		}
		if (drained.live) {
			this.emitter.emit(threadId, stored);
			const sizeBytes = Buffer.byteLength(JSON.stringify(drained.event), 'utf8');
			this.relayToSiblings(threadId, drained.event, sizeBytes);
		}
	}

	private relayToSiblings(threadId: string, event: InstanceAiEvent, sizeBytes: number): void {
		if (!this.instanceSettings.isMultiMain) return;

		if (sizeBytes > MAX_PUBSUB_PAYLOAD_BYTES) {
			this.logger.warn(
				`Skipping cross-main relay of "${event.type}" event (${sizeBytes} bytes exceeds ${MAX_PUBSUB_PAYLOAD_BYTES})`,
				{ threadId, runId: event.runId },
			);
			return;
		}

		void this.publisher
			.publishCommand({ command: 'relay-instance-ai-event', payload: { threadId, event } })
			.catch((error: unknown) =>
				this.logger.error('Failed to relay Instance AI event to sibling mains', {
					threadId,
					error,
				}),
			);
	}

	private evictIfNeeded(threadId: string, events: StoredEvent[]): void {
		let totalSize = this.sizeBytes.get(threadId) ?? 0;

		while (events.length > MAX_EVENTS_PER_THREAD || totalSize > MAX_BYTES_PER_THREAD) {
			const evicted = events.shift();
			if (!evicted) break;
			totalSize -= Buffer.byteLength(JSON.stringify(evicted.event), 'utf8');
		}

		this.sizeBytes.set(threadId, Math.max(0, totalSize));
	}

	private getOrCreateStore(threadId: string): StoredEvent[] {
		let events = this.store.get(threadId);
		if (!events) {
			events = [];
			this.store.set(threadId, events);
		}
		return events;
	}
}
