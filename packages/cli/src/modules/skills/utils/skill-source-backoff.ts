const BASE_DELAY_SECONDS = 60;
const MAX_DELAY_SECONDS = 6 * 60 * 60;

/** Repeated rate limits double the wait. A server deadline can exceed the local cap. */
export function skillSourceBackoffSeconds(
	attempt: number,
	retryAfterSeconds = 0,
	random = Math.random(),
): number {
	const backoff = Math.min(BASE_DELAY_SECONDS * 2 ** (attempt - 1), MAX_DELAY_SECONDS);
	const minimum = Math.max(backoff, retryAfterSeconds);
	// Add jitter after the minimum, so a retry never precedes the server deadline.
	return minimum + random * Math.min(minimum / 4, BASE_DELAY_SECONDS);
}
