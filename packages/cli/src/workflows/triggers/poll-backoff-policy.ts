import { Time } from '@n8n/constants';
import { backoff } from '@n8n/scheduler';

export type PollFailureClass = 'transient' | 'permanent';

export const MAX_BACKOFF_MS = 30 * Time.minutes.toMilliseconds;
export const RETRY_AFTER_MAX_MS = 1 * Time.hours.toMilliseconds;

const PERMANENT_STATUS_CODES = new Set([401, 403]);
const MAX_CANDIDATE_DEPTH = 5;
const CANDIDATE_CHILD_KEYS = ['cause', 'errorResponse', 'reason'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getResponse(candidate: unknown): Record<string, unknown> | undefined {
	if (!isRecord(candidate)) return undefined;
	const { response } = candidate;
	return isRecord(response) ? response : undefined;
}

// Breadth-first over cause/errorResponse/reason: a node wrapping a NodeApiError
// in a NodeOperationError puts the real response at depth 2. Visited set guards self-referential cause.
function candidateChain(error: unknown): Array<Record<string, unknown>> {
	if (!isRecord(error)) return [];

	const candidates: Array<Record<string, unknown>> = [];
	const visited = new Set<unknown>();
	const queue: Array<{ value: Record<string, unknown>; depth: number }> = [
		{ value: error, depth: 0 },
	];

	while (queue.length > 0) {
		const next = queue.shift();
		if (!next) break;
		const { value, depth } = next;
		if (visited.has(value)) continue;
		visited.add(value);
		candidates.push(value);

		if (depth >= MAX_CANDIDATE_DEPTH) continue;

		for (const key of CANDIDATE_CHILD_KEYS) {
			const child = value[key];
			if (isRecord(child) && !visited.has(child)) {
				queue.push({ value: child, depth: depth + 1 });
			}
		}
	}

	return candidates;
}

function parseNumericStatus(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

// Walks the chain once for both candidates, so we're not re-walking to look
// for response.status when no httpCode is found. httpCode wins when both are present.
function chainStatus(error: unknown): number | null {
	let httpCodeStatus: number | null = null;
	let responseStatus: number | null = null;

	for (const candidate of candidateChain(error)) {
		if (
			httpCodeStatus === null &&
			candidate.httpCode !== null &&
			candidate.httpCode !== undefined
		) {
			httpCodeStatus = parseNumericStatus(candidate.httpCode);
		}

		if (responseStatus === null) {
			const response = getResponse(candidate);
			if (response) responseStatus = parseNumericStatus(response.status);
		}
	}

	return httpCodeStatus ?? responseStatus;
}

function findHeaderValue(headers: unknown, name: string): string | string[] | undefined {
	if (!isRecord(headers)) return undefined;
	const lower = name.toLowerCase();
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() !== lower) continue;
		if (typeof value === 'string') return value;
		if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
			return value;
		}
	}
	return undefined;
}

function parseRetryAfterValue(raw: string, now: Date): number | null {
	const trimmed = raw.trim();
	if (/^\d+$/.test(trimmed)) {
		const seconds = Number(trimmed);
		return seconds > 0 ? seconds * Time.seconds.toMilliseconds : null;
	}

	const parsed = Date.parse(trimmed);
	if (Number.isNaN(parsed)) return null;

	const diff = parsed - now.getTime();
	return diff > 0 ? diff : null;
}

/**
 * A 401/403 is permanent unless it carries a Retry-After, which marks it as
 * rate limiting instead: some APIs (Google quota, GitHub secondary limits) throttle with those statuses.
 */
export function classifyPollFailure(error: unknown, retryAfterMs: number | null): PollFailureClass {
	const status = chainStatus(error);
	if (status === null || !PERMANENT_STATUS_CODES.has(status)) return 'transient';
	return retryAfterMs !== null ? 'transient' : 'permanent';
}

/**
 * The `Retry-After` value on the failing response, in ms, or `null` when
 * absent or unparseable. Resolved against `now` so an HTTP-date value can't
 * go stale.
 */
export function retryAfterMs(error: unknown, now: Date): number | null {
	for (const candidate of candidateChain(error)) {
		const response = getResponse(candidate);
		if (!response) continue;

		const value = findHeaderValue(response.headers, 'retry-after');
		if (value === undefined) continue;

		const raw = Array.isArray(value) ? value[0] : value;
		if (raw === undefined) continue;

		const parsed = parseRetryAfterValue(raw, now);
		if (parsed !== null) return parsed;
	}
	return null;
}

export function computeBackoffUntil(args: {
	failureClass: PollFailureClass;
	consecutiveErrors: number;
	retryAfterMs: number | null;
	now: Date;
}): Date {
	const { failureClass, consecutiveErrors, retryAfterMs: retryAfter, now } = args;

	// Starts at the ceiling rather than climbing to it: a lower plateau would
	// let a permanent failure back off less than an escalating transient one,
	// which the ceiling exists to bound.
	if (failureClass === 'permanent') {
		return new Date(now.getTime() + MAX_BACKOFF_MS);
	}

	const curveMs = backoff(consecutiveErrors, { maxMs: MAX_BACKOFF_MS });
	const cappedRetryAfterMs = Math.min(retryAfter ?? 0, RETRY_AFTER_MAX_MS);

	// Retry-After raises the floor rather than replacing the curve: honouring
	// it outright would pin a persistent failure to a fixed delay forever, and
	// ignoring it would poll again before the source said it was safe to.
	return new Date(now.getTime() + Math.max(curveMs, cappedRetryAfterMs));
}
