import { Time } from '@n8n/constants';
import { backoff } from '@n8n/scheduler';

export type PollFailureClass = 'transient' | 'permanent';

export const MAX_BACKOFF_MS = 30 * Time.minutes.toMilliseconds;
export const RETRY_AFTER_MAX_MS = 1 * Time.hours.toMilliseconds;

const PERMANENT_STATUS_CODES = new Set([401, 403]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getResponse(candidate: unknown): Record<string, unknown> | undefined {
	if (!isRecord(candidate)) return undefined;
	const { response } = candidate;
	return isRecord(response) ? response : undefined;
}

function walkResponses(error: unknown): Array<Record<string, unknown>> {
	if (!isRecord(error)) return [];

	const responses: Array<Record<string, unknown>> = [];

	const direct = getResponse(error);
	if (direct) responses.push(direct);

	const cause = isRecord(error.cause) ? error.cause : undefined;
	const causeResponse = cause ? getResponse(cause) : undefined;
	if (causeResponse) responses.push(causeResponse);

	const errorResponse = isRecord(error.errorResponse) ? error.errorResponse : undefined;
	const errorResponseResponse = errorResponse ? getResponse(errorResponse) : undefined;
	if (errorResponseResponse) responses.push(errorResponseResponse);

	const reason = errorResponse && isRecord(errorResponse.reason) ? errorResponse.reason : undefined;
	const reasonResponse = reason ? getResponse(reason) : undefined;
	if (reasonResponse) responses.push(reasonResponse);

	return responses;
}

function parseNumericStatus(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function httpCodeStatus(error: unknown): number | null {
	if (!isRecord(error) || error.httpCode === null || error.httpCode === undefined) return null;
	return parseNumericStatus(error.httpCode);
}

function statusFromWalk(error: unknown): number | null {
	for (const response of walkResponses(error)) {
		const status = parseNumericStatus(response.status);
		if (status !== null) return status;
	}
	return null;
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

export function classifyPollFailure(error: unknown): PollFailureClass {
	const status = httpCodeStatus(error) ?? statusFromWalk(error);
	return status !== null && PERMANENT_STATUS_CODES.has(status) ? 'permanent' : 'transient';
}

export function retryAfterMs(error: unknown, now: Date): number | null {
	for (const response of walkResponses(error)) {
		const value = findHeaderValue(response.headers, 'retry-after');
		if (value === undefined) continue;

		const raw = Array.isArray(value) ? value[0] : value;
		if (raw === undefined) continue;

		return parseRetryAfterValue(raw, now);
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

	if (failureClass === 'permanent') {
		return new Date(now.getTime() + MAX_BACKOFF_MS);
	}

	const curveMs = backoff(consecutiveErrors, { maxMs: MAX_BACKOFF_MS });
	const cappedRetryAfterMs = Math.min(retryAfter ?? 0, RETRY_AFTER_MAX_MS);

	return new Date(now.getTime() + Math.max(curveMs, cappedRetryAfterMs));
}
