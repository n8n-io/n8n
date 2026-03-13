import { Service } from '@n8n/di';
import { EventEmitter } from 'node:events';
import type { InstanceAiEvent } from '@n8n/api-types';
import type { InstanceAiEventBus, StoredEvent } from '@n8n/instance-ai';

@Service()
export class InProcessEventBus implements InstanceAiEventBus {
	private readonly emitter = new EventEmitter();

	private readonly store = new Map<string, StoredEvent[]>();

	constructor() {
		// Avoid warnings when many SSE clients connect (each adds a listener per thread)
		this.emitter.setMaxListeners(0);
	}

	publish(threadId: string, event: InstanceAiEvent): void {
		const events = this.getOrCreateStore(threadId);
		const id = events.length + 1; // 1-based monotonic per thread
		const stored: StoredEvent = { id, event };
		events.push(stored);
		this.emitter.emit(threadId, stored);
	}

	subscribe(threadId: string, handler: (storedEvent: StoredEvent) => void): () => void {
		this.emitter.on(threadId, handler);
		return () => this.emitter.off(threadId, handler);
	}

	getEventsAfter(threadId: string, afterId: number): StoredEvent[] {
		const events = this.store.get(threadId);
		if (!events) return [];
		// Events are 1-based and ordered — simple filter is sufficient for in-process
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
		const events = this.store.get(threadId);
		return (events?.length ?? 0) + 1;
	}

	/** Clear all stored events. Used during module shutdown. */
	clear(): void {
		this.store.clear();
		this.emitter.removeAllListeners();
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
