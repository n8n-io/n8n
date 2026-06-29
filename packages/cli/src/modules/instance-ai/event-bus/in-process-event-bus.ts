import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { EventEmitter } from 'node:events';
import { InstanceSettings } from 'n8n-core';
import type { InstanceAiEvent } from '@n8n/api-types';
import type { InstanceAiEventBus, StoredEvent } from '@n8n/instance-ai';

import { Publisher } from '@/scaling/pubsub/publisher.service';

const MAX_EVENTS_PER_THREAD = 500;
const MAX_BYTES_PER_THREAD = 2 * 1024 * 1024; // 2 MB

/** Skip relaying events larger than this — they'd bloat the pubsub channel.
 *  State still reconciles on the next connect via the run-sync snapshot bootstrap. */
const MAX_RELAY_BYTES = 5 * 1024 * 1024; // 5 MiB, mirrors push relay

@Service()
export class InProcessEventBus implements InstanceAiEventBus {
	private readonly emitter = new EventEmitter();

	private readonly store = new Map<string, StoredEvent[]>();

	/** Approximate serialized size per thread for eviction. */
	private readonly sizeBytes = new Map<string, number>();

	/** Monotonic counter per thread — never resets even after eviction. */
	private readonly nextId = new Map<string, number>();

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
	) {
		this.logger = this.logger.scoped('instance-ai');
		// Avoid warnings when many SSE clients connect (each adds a listener per thread)
		this.emitter.setMaxListeners(0);
	}

	/**
	 * Publish an event for a thread: store it, deliver it to local SSE
	 * subscribers, and — in multi-main — relay it to sibling mains so the main
	 * holding the client's SSE connection (which may not be this one) delivers it.
	 */
	publish(threadId: string, event: InstanceAiEvent): void {
		this.storeAndEmit(threadId, event);
		this.relayToSiblings(threadId, event);
	}

	/**
	 * Store + deliver locally WITHOUT relaying. Used by the pubsub handler when a
	 * relayed event arrives from another main — re-relaying would loop. The local
	 * `nextId` stamps the SSE id, so this main is the id authority for the
	 * connection it serves.
	 */
	publishLocalOnly(threadId: string, event: InstanceAiEvent): void {
		this.storeAndEmit(threadId, event);
	}

	private storeAndEmit(threadId: string, event: InstanceAiEvent): void {
		const events = this.getOrCreateStore(threadId);
		const id = (this.nextId.get(threadId) ?? 0) + 1;
		this.nextId.set(threadId, id);

		const stored: StoredEvent = { id, event };
		const eventSize = JSON.stringify(event).length;

		events.push(stored);
		this.sizeBytes.set(threadId, (this.sizeBytes.get(threadId) ?? 0) + eventSize);

		// Evict oldest events if count or size exceeds caps
		this.evictIfNeeded(threadId, events);

		this.emitter.emit(threadId, stored);
	}

	private relayToSiblings(threadId: string, event: InstanceAiEvent): void {
		if (!this.instanceSettings.isMultiMain) return;

		const sizeBytes = Buffer.byteLength(JSON.stringify(event), 'utf8');
		if (sizeBytes > MAX_RELAY_BYTES) {
			this.logger.warn(
				`Skipping cross-main relay of "${event.type}" event (${sizeBytes} bytes exceeds ${MAX_RELAY_BYTES})`,
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

	/** A relayed event from another main: re-emit to this main's SSE clients only
	 *  if it actually holds a subscription for the thread (avoids every main
	 *  buffering every thread). */
	@OnPubSubEvent('relay-instance-ai-event', { instanceType: 'main' })
	handleRelayInstanceAiEvent({
		threadId,
		event,
	}: { threadId: string; event: InstanceAiEvent }): void {
		if (!this.hasSubscribers(threadId)) return;
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

	getEventsAfter(threadId: string, afterId: number): StoredEvent[] {
		const events = this.store.get(threadId);
		if (!events) return [];
		return events.filter((e) => e.id > afterId);
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

	getNextEventId(threadId: string): number {
		return (this.nextId.get(threadId) ?? 0) + 1;
	}

	/** Clear stored events for a specific thread (e.g. on thread expiration). */
	clearThread(threadId: string): void {
		this.store.delete(threadId);
		this.sizeBytes.delete(threadId);
		this.nextId.delete(threadId);
		this.emitter.removeAllListeners(threadId);
	}

	/** Clear all stored events. Used during module shutdown. */
	clear(): void {
		this.store.clear();
		this.sizeBytes.clear();
		this.nextId.clear();
		this.emitter.removeAllListeners();
	}

	private evictIfNeeded(threadId: string, events: StoredEvent[]): void {
		let totalSize = this.sizeBytes.get(threadId) ?? 0;

		while (events.length > MAX_EVENTS_PER_THREAD || totalSize > MAX_BYTES_PER_THREAD) {
			const evicted = events.shift();
			if (!evicted) break;
			totalSize -= JSON.stringify(evicted.event).length;
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
