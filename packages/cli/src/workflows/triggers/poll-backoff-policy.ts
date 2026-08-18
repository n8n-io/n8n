import { Time } from '@n8n/constants';
import { backoff } from '@n8n/scheduler';

export type PollFailureClass = 'transient' | 'permanent';

export const MAX_BACKOFF_MS = 30 * Time.minutes.toMilliseconds;
export const RETRY_AFTER_MAX_MS = 1 * Time.hours.toMilliseconds;

const PERMANENT_STATUS_CODES = new Set([401, 403]);
const MAX_CAUSE_DEPTH = 5;
const CAUSE_KEYS = ['cause', 'errorResponse', 'reason'] as const;

type UnknownRecord = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is UnknownRecord =>
	typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const positiveOrNull = (ms: number): number | null => (ms > 0 ? ms : null);

function firstNonNull<T, R>(items: Iterable<T>, select: (item: T) => R | null): R | null {
	for (const item of items) {
		const selected = select(item);
		if (selected !== null) {
			return selected;
		}
	}
	return null;
}

/** The causes of `errors` that `seen` does not hold yet, marking them seen. */
function takeUnseenCauses(errors: UnknownRecord[], seen: Set<UnknownRecord>): UnknownRecord[] {
	const unseen: UnknownRecord[] = [];

	for (const error of errors) {
		for (const key of CAUSE_KEYS) {
			const cause = error[key];
			if (isRecord(cause) && seen.has(cause)) {
				seen.add(cause);
				unseen.push(cause);
			}
		}
	}

	return unseen;
}

/**
 * The error and its nested causes, shallowest first.
 *
 * A node may wrap a `NodeApiError` in a `NodeOperationError`, which puts the
 * real response two levels down. Bounded by `MAX_CAUSE_DEPTH`, and each error
 * is visited once so a self-referential cause cannot loop.
 */
function* errorChain(error: unknown): Generator<UnknownRecord> {
	if (isRecord(error)) {
		const seen = new Set<UnknownRecord>([error]);
		let generation: UnknownRecord[] = [error];

		for (let depth = 0; depth <= MAX_CAUSE_DEPTH && generation.length > 0; depth++) {
			yield* generation;
			generation = takeUnseenCauses(generation, seen);
		}
	}
}

const responseOf = (error: UnknownRecord): UnknownRecord | undefined =>
	isRecord(error.response) ? error.response : undefined;

/** An HTTP status read from a number or a numeric string, or `null` when it is neither. */
function toStatusCode(value: unknown): number | null {
	const isNumeric = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
	if (!isNumeric) {
		return null;
	}

	const status = Number(value);
	return Number.isFinite(status) ? status : null;
}

/**
 * The status of the failing response.
 *
 * An `httpCode` anywhere in the chain outranks any `response.status`, so the
 * walk stops at the first one but has to reach the end to rule them all out.
 */
function statusCode(error: unknown): number | null {
	let responseStatus: number | null = null;

	for (const candidate of errorChain(error)) {
		const httpCode = toStatusCode(candidate.httpCode);
		if (httpCode !== null) {
			return httpCode;
		}

		responseStatus ??= toStatusCode(responseOf(candidate)?.status);
	}

	return responseStatus;
}

/** The named header, matched case-insensitively, or `undefined` when absent or not textual. */
function headerValue(headers: unknown, name: string): string | undefined {
	if (!isRecord(headers)) {
		return undefined;
	}

	const wanted = name.toLowerCase();
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() !== wanted) {
			continue;
		}
		if (typeof value === 'string') {
			return value;
		}
		if (isStringArray(value)) {
			return value[0];
		}
	}

	return undefined;
}

/** A `Retry-After` value, in either the delay-seconds or HTTP-date form, as ms from `now`. */
function parseRetryAfter(raw: string, now: Date): number | null {
	const value = raw.trim();

	if (/^\d+$/.test(value)) {
		return positiveOrNull(Number(value) * Time.seconds.toMilliseconds);
	}

	const deadline = Date.parse(value);
	return Number.isNaN(deadline) ? null : positiveOrNull(deadline - now.getTime());
}

/**
 * Whether the failure is worth retrying on the usual curve.
 *
 * A 401/403 is permanent unless it carries a `Retry-After`, which marks it as
 * rate limiting instead: some APIs throttle with those statuses rather than a 429.
 */
export function classifyPollFailure(error: unknown, retryAfterMs: number | null): PollFailureClass {
	const status = statusCode(error);
	const isPermanentStatus = status !== null && PERMANENT_STATUS_CODES.has(status);

	return isPermanentStatus && retryAfterMs === null ? 'permanent' : 'transient';
}

/**
 * The `Retry-After` on the failing response, in ms, or `null` when absent or
 * unparseable. Resolved against `now`, so an HTTP-date value cannot go stale.
 */
export function retryAfterMs(error: unknown, now: Date): number | null {
	return firstNonNull(errorChain(error), (candidate) => {
		const raw = headerValue(responseOf(candidate)?.headers, 'retry-after');
		return raw === undefined ? null : parseRetryAfter(raw, now);
	});
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
