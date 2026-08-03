/**
 * Configuration options for the SlidingWindow
 */
export interface SlidingWindowOptions {
	/** Maximum number of events to track for rate limiting purposes */
	maxEvents: number;
	/** Duration of the sliding window in milliseconds */
	durationMs: number;
}

/**
 * A sliding window implementation for tracking events within a time window.
 * Useful for rate limiting, monitoring event frequencies, or implementing circuit breakers.
 *
 * @example
 * ```typescript
 * const window = new SlidingWindow({ maxEvents: 100, durationMs: 60000 }); // 100 events per minute
 * window.addEvent(Date.now());
 * const count = window.getCount(); // Returns number of events in the last minute
 * ```
 */
export class SlidingWindow {
	private maxEvents: number;
	private durationMs: number;
	private eventTimestamps: number[] = [];

	/**
	 * Creates a new SlidingWindow instance
	 * @param options - Configuration for the sliding window
	 */
	constructor(options: SlidingWindowOptions) {
		this.maxEvents = options.maxEvents;
		this.durationMs = options.durationMs;
	}

	/**
	 * Adds an event timestamp to the sliding window.
	 * Automatically prunes the internal array if it grows beyond 2x maxEvents to prevent unbounded growth.
	 *
	 * @param timestamp - Unix timestamp in milliseconds of when the event occurred
	 */
	addEvent(timestamp: number) {
		this.eventTimestamps.push(timestamp);

		// Remove events if they exceed the maximum allowed maxEvents times 2
		if (this.eventTimestamps.length > this.maxEvents * 2) {
			this.eventTimestamps = this.eventTimestamps.slice(-this.maxEvents * 2);
		}
	}

	/**
	 * Gets the count of events within the current sliding window.
	 * Removes expired events that fall outside the time window before returning the count.
	 *
	 * @returns The number of events that occurred within the sliding window duration from now
	 */
	getCount() {
		const now = Date.now();
		const windowStart = now - this.durationMs;
		this.eventTimestamps = this.eventTimestamps.filter((timestamp) => timestamp >= windowStart);
		return this.eventTimestamps.length;
	}

	/**
	 * Clears all tracked events from the sliding window
	 */
	clear() {
		this.eventTimestamps = [];
	}
}
