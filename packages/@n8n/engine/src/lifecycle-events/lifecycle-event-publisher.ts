import type { LifecycleEvent } from './lifecycle-event.types';

/** Where a handler announces a transition it won. */
export interface LifecycleEventPublisher {
	/** Announces an event. Never throws, and never blocks the caller. */
	publish(event: LifecycleEvent): void;
	/** Stops accepting events and delivers whatever is buffered. */
	stop(): Promise<void>;
}

/** Publisher for a host that is not listening. */
export const noopLifecycleEventPublisher: LifecycleEventPublisher = Object.freeze({
	publish: () => {},
	stop: async () => {},
});
