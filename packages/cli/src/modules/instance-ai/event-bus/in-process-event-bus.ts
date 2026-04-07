import { Service } from '@n8n/di';
import { EventEmitter } from 'node:events';
import type { InstanceAiEvent } from '@n8n/api-types';
import type { InstanceAiEventBus, StoredEvent } from '@n8n/instance-ai';

const MAX_EVENTS_PER_THREAD = 500;
const MAX_BYTES_PER_THREAD = 2 * 1024 * 1024; // 2 MB

@Service()
export class InProcessEventBus implements InstanceAiEventBus {
	private readonly emitter = new EventEmitter();

	private readonly store = new Map<string, StoredEvent[]>();

	/** Approximate serialized size per thread for eviction. */
	private readonly sizeBytes = new Map<string, number>();

	/** Monotonic counter per thread — never resets even after eviction. */
	private readonly nextId = new Map<string, number>();

	constructor() {
		// Avoid warnings when many SSE clients connect (each adds a listener per thread)
		this.emitter.setMaxListeners(0);
	}

	publish(threadId: string, event: InstanceAiEvent): void {
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

	subscribe(threadId: string, handler: (storedEvent: StoredEvent) => void): () => void {
		this.emitter.on(threadId, handler);
		return () => this.emitter.off(threadId, handler);
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
