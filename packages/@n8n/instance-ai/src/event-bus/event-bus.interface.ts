import type { InstanceAiEvent } from '@n8n/api-types';

/**
 * Stored event with a per-thread monotonic ID for SSE replay.
 * `id` is absent on ephemeral events (text/reasoning deltas, status): they are
 * live-delivered but never persisted, and their SSE frames carry no `id:` line
 * so the browser replay cursor only advances on durable facts.
 */
export interface StoredEvent {
	id?: number; // monotonically increasing per thread, 1-based, durable facts only
	event: InstanceAiEvent;
}

type Unsubscribe = () => void;

/** Domain-level interface -- no transport details leak through. */
export interface InstanceAiEventBus {
	/**
	 * Publish an event to a thread channel.
	 * The implementation assigns the next monotonic `id` and persists it.
	 */
	publish(threadId: string, event: InstanceAiEvent): void;

	/**
	 * Subscribe to live events on a thread channel.
	 * Returns an unsubscribe function.
	 */
	subscribe(threadId: string, handler: (storedEvent: StoredEvent) => void): Unsubscribe;

	/**
	 * Retrieve recent events for a thread that belong to a specific run.
	 * Cache-scoped, same-process, best-effort: replay and cross-restart reads
	 * go to the durable log, not this interface.
	 */
	getEventsForRun(threadId: string, runId: string): InstanceAiEvent[];

	/**
	 * Retrieve recent events for a thread that belong to any of the specified
	 * runs. Same cache-scoped semantics as getEventsForRun.
	 */
	getEventsForRuns(threadId: string, runIds: string[]): InstanceAiEvent[];
}
