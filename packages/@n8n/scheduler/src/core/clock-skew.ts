/**
 * Compares this instance's clock against the clock the scheduler coordinates on.
 * Coordination (due-ness, leases) runs on that shared clock, but fire timers are
 * armed on the instance's own clock, so a difference between the two makes tasks
 * fire early or late. The host supplies a way to read the shared clock; `start`
 * samples it once and reports a meaningful skew through the event sink. The math
 * here is pure so it is tested on its own.
 */

/** One estimate of how far the coordination clock leads (or trails) the instance clock. */
export interface ClockSkew {
	/** Coordination clock minus instance clock, in ms. Positive means it is ahead. */
	offsetMs: number;
	/** Round-trip of the sampling read, in ms; bounds the estimate's error (±half). */
	roundTripMs: number;
}

/**
 * Offset, in ms, above which the two clocks count as meaningfully out of sync.
 * Below this, ordinary round-trip jitter and sub-second drift are not worth
 * reporting; above it, fire timing is noticeably off and an operator should check
 * that this instance's clock is synchronised (e.g. via NTP).
 */
export const CLOCK_SKEW_WARN_THRESHOLD_MS = 1_000;

/** Tuning for the start-time clock-skew check. */
export interface ClockSkewOptions {
	/** {@link CLOCK_SKEW_WARN_THRESHOLD_MS} */
	warnThresholdMs: number;
}

export const DEFAULT_CLOCK_SKEW_OPTIONS: ClockSkewOptions = {
	warnThresholdMs: CLOCK_SKEW_WARN_THRESHOLD_MS,
};

/**
 * Estimate the clock offset from a single round-trip: the coordination clock was
 * read at some instant between `before` and `after`, so that instant maps to their
 * midpoint on the instance clock, giving offset = `referenceNow - midpoint`.
 */
export function measureClockSkew(sample: {
	/** Instance clock immediately before reading the coordination clock. */
	before: number;
	/** The coordination clock that was read. */
	referenceNow: number;
	/** Instance clock immediately after reading the coordination clock. */
	after: number;
}): ClockSkew {
	const midpoint = sample.before + (sample.after - sample.before) / 2;
	return {
		offsetMs: sample.referenceNow - midpoint,
		roundTripMs: sample.after - sample.before,
	};
}

/**
 * Whether a measured skew is worth reporting: the offset must exceed both the
 * threshold and the measurement's own uncertainty (half the round-trip), so a slow
 * read (e.g. a cold connection) can never trip the warning on its own.
 */
export function isClockSkewSignificant(
	skew: ClockSkew,
	thresholdMs: number = CLOCK_SKEW_WARN_THRESHOLD_MS,
): boolean {
	return Math.abs(skew.offsetMs) > Math.max(thresholdMs, skew.roundTripMs / 2);
}
