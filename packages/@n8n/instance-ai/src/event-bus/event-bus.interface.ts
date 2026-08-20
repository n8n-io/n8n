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

/**
 * Domain-level interface -- no transport details leak through. Reads are not
 * part of it: events are persisted to `instance_ai_events`, and replay and
 * run-scoped reads go through the durable event log, not the bus.
 */
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
	 * Get the next event ID that will be assigned for a thread.
	 * Used to seed the frontend's SSE replay cursor after message hydration.
	 * Async because the id comes from the durable log.
	 */
	getNextEventId(threadId: string): Promise<number>;
}
