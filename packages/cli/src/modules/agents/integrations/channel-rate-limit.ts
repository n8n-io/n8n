import { Time } from '@n8n/constants';
import { httpStatusFromError } from '@n8n/backend-network';
import { isRecord } from '@n8n/utils/is-record';

import { INTEGRATION_ERROR_CODES } from './integration-error-codes';
import {
	integrationError,
	rateLimitExceeded,
	type IntegrationErrorResponse,
} from './integration-helpers';
import type { ChannelRateLimitGuard } from './channel-rate-limit.guard';

export const CHANNEL_RATE_LIMIT_COOLDOWN_MS = 15 * Time.minutes.toMilliseconds;

function isRateLimitExceededResult(value: unknown): boolean {
	return (
		isRecord(value) &&
		value.ok === false &&
		isRecord(value.error) &&
		value.error.code === INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED
	);
}

function rateLimitMessageFromResult(value: unknown): string | undefined {
	if (
		isRecord(value) &&
		value.ok === false &&
		isRecord(value.error) &&
		value.error.code === INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED &&
		typeof value.error.message === 'string'
	) {
		return value.error.message;
	}
	return undefined;
}

export function rateLimitMessageFromError(error: unknown): string | undefined {
	if (!isRateLimitedToolOutput(error)) return undefined;
	// Single result: { ok: false, error: { code, message } }
	const single = rateLimitMessageFromResult(error);
	if (single !== undefined) return single;
	// Batched action calls nest per-operation results under `results`; the
	// stream consumer stores the whole batch as the fallback, so extract the
	// message from the first rate-limited entry before falling back.
	if (isRecord(error) && Array.isArray(error.results)) {
		for (const entry of error.results) {
			if (!isRecord(entry)) continue;
			const message = rateLimitMessageFromResult(entry.result);
			if (message !== undefined) return message;
		}
	}
	return undefined;
}

export function isRateLimitedToolOutput(output: unknown): boolean {
	if (isRateLimitExceededResult(output)) return true;
	if (!isRecord(output) || !Array.isArray(output.results)) return false;
	return output.results.some((entry) => isRecord(entry) && isRateLimitExceededResult(entry.result));
}

export function isHttp429(error: unknown): boolean {
	return httpStatusFromError(error) === 429;
}

export function channelRateLimitMessage(platform: string): string {
	const label = `${platform.charAt(0).toUpperCase()}${platform.slice(1)}`;
	return `The ${label} integration has exceeded its rate limit. Please wait a few minutes before trying again.`;
}

export function caughtIntegrationError(
	error: unknown,
	params: {
		connectionId: string;
		platform: string;
		guard: ChannelRateLimitGuard | undefined;
		failedCode:
			| typeof INTEGRATION_ERROR_CODES.ACTION_FAILED
			| typeof INTEGRATION_ERROR_CODES.CONTEXT_QUERY_FAILED;
	},
): IntegrationErrorResponse {
	if (isHttp429(error)) {
		params.guard?.record(params.connectionId);
		return rateLimitExceeded(channelRateLimitMessage(params.platform));
	}
	return integrationError(
		params.failedCode,
		error instanceof Error ? error.message : String(error),
	);
}
