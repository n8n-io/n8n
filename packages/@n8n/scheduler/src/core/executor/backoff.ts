import { Time } from '@n8n/constants';

/**
 * Retry backoff for a failed task attempt: how long to wait before it may run
 * again. Exponential in the attempt number, capped so it never grows without
 * bound. Pure so both the executor (handler-error retry) and the reaper
 * (lease-expiry reclaim) can share one curve.
 *
 * `attempts` is the number of the attempt that just failed (1 for the first).
 */
export interface BackoffOptions {
	/** Delay after the first failed attempt, in ms. */
	baseMs?: number;
	/** Multiplier applied per additional attempt. */
	factor?: number;
	/** Upper bound on the delay, in ms. */
	maxMs?: number;
}

const DEFAULT_BASE_MS = 5 * Time.seconds.toMilliseconds;
const DEFAULT_FACTOR = 2;
const DEFAULT_MAX_MS = 5 * Time.minutes.toMilliseconds;

export function backoff(attempts: number, opts: BackoffOptions = {}): number {
	const { baseMs = DEFAULT_BASE_MS, factor = DEFAULT_FACTOR, maxMs = DEFAULT_MAX_MS } = opts;
	if (attempts < 1) return 0;
	const raw = baseMs * factor ** (attempts - 1);
	return Math.min(raw, maxMs);
}
