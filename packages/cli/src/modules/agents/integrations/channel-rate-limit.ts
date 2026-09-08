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

export function rateLimitMessageFromError(error: unknown): string | undefined {
	if (
		isRateLimitedToolOutput(error) &&
		isRecord(error) &&
		isRecord(error.error) &&
		typeof error.error.message === 'string'
	) {
		return error.error.message;
	}
	if (error instanceof Error && error.message.includes('temporarily limiting requests')) {
		return error.message;
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
