import type { InstanceAiEvent } from '@n8n/api-types';

/** Stored event with a per-thread monotonic ID for SSE replay. */
export interface StoredEvent {
	id: number; // monotonically increasing per thread, 1-based
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
	 * Retrieve all persisted events for a thread with id > afterId.
	 * Used for replay on reconnect.
	 * Returns events in id order (ascending).
	 */
	getEventsAfter(threadId: string, afterId: number): StoredEvent[];

	/**
	 * Retrieve all persisted events for a thread that belong to a specific run.
	 * More efficient than getEventsAfter(threadId, 0) + filter when only one
	 * run's events are needed (e.g. building agent tree snapshots).
	 */
	getEventsForRun(threadId: string, runId: string): InstanceAiEvent[];

	/**
	 * Retrieve all persisted events for a thread that belong to any of the
	 * specified runs. Used for rebuilding merged assistant turns that span
	 * multiple auto-follow-up runs.
	 */
	getEventsForRuns(threadId: string, runIds: string[]): InstanceAiEvent[];

	/**
	 * Get the next event ID that will be assigned for a thread.
	 * Used to seed the frontend's SSE replay cursor after message hydration.
	 * Async because multi-main implementations read a shared sequence.
	 */
	getNextEventId(threadId: string): Promise<number>;
}
