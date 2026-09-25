import { retryabilityFromError } from '@n8n/backend-network';
import { Time } from '@n8n/constants';
import { backoff } from '@n8n/scheduler';
import { errorChain, isObjectLike, type UnknownRecord } from '@n8n/utils/errors/error-chain';
import type { ActionableCause, TimedCause } from 'n8n-workflow';
import { ACTIONABLE_CAUSES, TIMED_CAUSES } from 'n8n-workflow';

export type PollFailureType = 'transient' | 'permanent';

export const MAX_BACKOFF_MS = 30 * Time.minutes.toMilliseconds;
export const RETRY_AFTER_MAX_MS = 1 * Time.hours.toMilliseconds;

/** How a failed poll is to be backed off. */
export type PollFailure = {
	type: PollFailureType;
	/** Wait the source asked for, in ms, or `null` when it asked for nothing usable. */
	retryAfterMs: number | null;
	/** The cause behind the failure, absent when neither the node nor the network shape tells. */
	cause?: TimedCause | ActionableCause;
};

/**
 * The backoff inputs carried by a failed poll, read from one of two sources.
 * The node's own declaration, the `failure` it attached to its error, is
 * trusted first. When the node declared nothing, the network shape of the
 * error is the fallback.
 */
export function pollFailureFromError(error: unknown, now: Date): PollFailure {
	return pollFailureDeclaredByNode(error, now) ?? pollFailureFromNetwork(error, now);
}

const TIMED: ReadonlySet<string> = new Set(TIMED_CAUSES);
const ACTIONABLE: ReadonlySet<string> = new Set(ACTIONABLE_CAUSES);

const isTimedCause = (value: unknown): value is TimedCause =>
	typeof value === 'string' && TIMED.has(value);

const isActionableCause = (value: unknown): value is ActionableCause =>
	typeof value === 'string' && ACTIONABLE.has(value);

function pollFailureDeclaredByNode(error: unknown, now: Date): PollFailure | undefined {
	for (const level of errorChain(error)) {
		const failure = level.failure;
		if (isObjectLike(failure)) {
			if (isActionableCause(failure.cause)) {
				return { type: 'permanent', retryAfterMs: null, cause: failure.cause };
			}
			if (isTimedCause(failure.cause)) {
				return {
					type: 'transient',
					retryAfterMs: declaredWaitMs(failure, now),
					cause: failure.cause,
				};
			}
		}
	}
	return undefined;
}

function declaredWaitMs(failure: UnknownRecord, now: Date): number | null {
	const { retryAfterMs, resetsAtEpochMs } = failure;
	if (typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
		return retryAfterMs;
	}
	if (typeof resetsAtEpochMs === 'number' && Number.isFinite(resetsAtEpochMs)) {
		const waitMs = resetsAtEpochMs - now.getTime();
		if (waitMs > 0) {
			return waitMs;
		}
	}
	return null;
}

function pollFailureFromNetwork(error: unknown, now: Date): PollFailure {
	const { retryable, status, retryAfterMs } = retryabilityFromError(error, now);

	if (retryable === 'no') {
		return { type: 'permanent', retryAfterMs: null };
	}

	// A parseable header is the throttling signal, whatever it says: `Retry-After: 0`
	// and an already-elapsed HTTP-date both resolve to 0, and a dead credential never
	// carries one. Its value only raises the floor, so the two are read separately.
	const throttled = retryAfterMs !== undefined;
	const waitMs = throttled && retryAfterMs > 0 ? retryAfterMs : null;

	if (status === 429 || throttled) {
		return { type: 'transient', retryAfterMs: waitMs, cause: 'rate-limited' };
	}
	if (status === 401) {
		return { type: 'permanent', retryAfterMs: null, cause: 'credential-invalid' };
	}
	if (status === 403) {
		return { type: 'permanent', retryAfterMs: null };
	}
	// A 5xx/408, a transport failure or a DNS failure: the source is degraded.
	if (retryable === 'yes') {
		return { type: 'transient', retryAfterMs: null, cause: 'temporarily-unavailable' };
	}

	return { type: 'transient', retryAfterMs: null };
}

/**
 * How long the next poll must wait, in ms. Anchored by the caller, so the
 * database clock can be the anchor rather than this process's.
 *
 * A permanent failure starts at the ceiling instead of climbing to it, since a
 * lower plateau would back off less than an escalating transient one. A
 * `Retry-After` raises the floor rather than replacing the curve: honouring it
 * outright would pin a persistent failure to a fixed delay forever, and
 * ignoring it would poll again before the source said it was safe to.
 */
export function computeBackoffDelayMs(args: {
	type: PollFailureType;
	consecutiveErrors: number;
	retryAfterMs: number | null;
}): number {
	const { type, consecutiveErrors, retryAfterMs: retryAfter } = args;

	const curveMs = backoff(consecutiveErrors, { maxMs: MAX_BACKOFF_MS });
	const floorMs = Math.min(retryAfter ?? 0, RETRY_AFTER_MAX_MS);

	return type === 'permanent' ? MAX_BACKOFF_MS : Math.max(curveMs, floorMs);
}
