import { retryabilityFromError } from '@n8n/backend-network';
import { Time } from '@n8n/constants';
import { backoff } from '@n8n/scheduler';

export type PollFailureClass = 'transient' | 'permanent';

export const MAX_BACKOFF_MS = 30 * Time.minutes.toMilliseconds;
export const RETRY_AFTER_MAX_MS = 1 * Time.hours.toMilliseconds;

const PERMANENT_STATUS_CODES = new Set([401, 403]);

/** How a failed poll is to be backed off. */
export type PollFailure = {
	failureClass: PollFailureClass;
	/** Wait the source asked for, in ms, or `null` when it asked for nothing usable. */
	retryAfterMs: number | null;
};

/**
 * The backoff inputs carried by a failed poll.
 *
 * A 401/403 is permanent unless it carries a `Retry-After`, which marks it as
 * rate limiting instead: some APIs throttle with those statuses rather than a
 * 429. A failure proven not worth retrying is permanent whatever its status.
 */
export function pollFailureFromError(error: unknown, now: Date): PollFailure {
	const { retryable, status, retryAfterMs } = retryabilityFromError(error, now);

	// An elapsed or zero deadline asks for no wait at all, so it is no ask.
	const retryAfter = retryAfterMs !== undefined && retryAfterMs > 0 ? retryAfterMs : null;

	const isPermanentStatus = status !== undefined && PERMANENT_STATUS_CODES.has(status);
	const failureClass: PollFailureClass =
		retryable === 'no' || (isPermanentStatus && retryAfter === null) ? 'permanent' : 'transient';

	return { failureClass, retryAfterMs: retryAfter };
}

/**
 * When the next poll may run.
 *
 * A permanent failure starts at the ceiling instead of climbing to it, since a
 * lower plateau would back off less than an escalating transient one. A
 * `Retry-After` raises the floor rather than replacing the curve: honouring it
 * outright would pin a persistent failure to a fixed delay forever, and
 * ignoring it would poll again before the source said it was safe to.
 */
export function computeBackoffUntil(args: {
	failureClass: PollFailureClass;
	consecutiveErrors: number;
	retryAfterMs: number | null;
	now: Date;
}): Date {
	const { failureClass, consecutiveErrors, retryAfterMs: retryAfter, now } = args;

	const curveMs = backoff(consecutiveErrors, { maxMs: MAX_BACKOFF_MS });
	const floorMs = Math.min(retryAfter ?? 0, RETRY_AFTER_MAX_MS);
	const delayMs = failureClass === 'permanent' ? MAX_BACKOFF_MS : Math.max(curveMs, floorMs);

	return new Date(now.getTime() + delayMs);
}
