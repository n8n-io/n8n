import type { StatusUpdate } from './status-update.types';

/** Where a handler announces a transition it won. */
export interface StatusPublisher {
	/** Announces an update. Never throws, and never blocks the caller. */
	publish(update: StatusUpdate): void;
	/** Stops accepting updates and delivers whatever is buffered. */
	stop(): Promise<void>;
}

/** Publisher for a host that supplied no `statusCallback` — nothing is listening. */
export const noopStatusPublisher: StatusPublisher = Object.freeze({
	publish: () => {},
	stop: async () => {},
});
