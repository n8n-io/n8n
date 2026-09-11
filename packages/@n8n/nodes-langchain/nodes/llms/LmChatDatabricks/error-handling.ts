import { isRecord } from '@n8n/utils/is-record';
import { OperationalError } from 'n8n-workflow';

import { findSessionExpiredError } from '../../../utils/oauth2-token-provider';
import { openAiFailedAttemptHandler } from '../../vendors/OpenAi/helpers/error-handling';

/**
 * Databricks error bodies are `{ error_code, message }`. The OpenAI client only
 * surfaces `{ error: { message } }` and otherwise reports "<status> status code
 * (no body)", losing e.g. "endpoint is temporarily disabled due to a
 * Databricks-set rate limit of 0". Reshape so the real message reaches the user.
 */
export function wrapDatabricksErrorFetch(baseFetch: typeof fetch): typeof fetch {
	return async (input, init) => {
		const response = await baseFetch(input, init);
		if (response.ok) return response;

		const text = await response.text();
		let body = text;
		try {
			const parsed: unknown = JSON.parse(text);
			if (isRecord(parsed) && !('error' in parsed) && typeof parsed.message === 'string') {
				body = JSON.stringify({ error: { message: parsed.message, code: parsed.error_code } });
			}
		} catch {}

		const headers = new Headers(response.headers);
		headers.delete('content-length');
		return new Response(body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	};
}

/**
 * Databricks answers both a dead token and "no permission on this endpoint" with
 * 403 `PERMISSION_DENIED`, so only the message tells them apart - and only the
 * first is worth telling the user to reconnect over.
 */
function indicatesInvalidToken(text: string): boolean {
	return /invalid\s+(access\s+)?token|token\s+(is\s+)?(invalid|expired)|expired\s+token/i.test(
		text,
	);
}

function isExpiredTokenResponse(error: unknown, expiredStatus: number): boolean {
	if (typeof error !== 'object' || error === null) return false;
	if (!('status' in error) || error.status !== expiredStatus) return false;
	return (
		'message' in error && typeof error.message === 'string' && indicatesInvalidToken(error.message)
	);
}

/**
 * A dead session arrives either as a rejected response or as a wrapped throw.
 * `expiredStatus` is undefined for grants that cannot be reconnected, such as a
 * service principal — those keep the generic "check your credentials" advice.
 */
export function makeDatabricksFailedAttemptHandler(expiredStatus?: number) {
	return (error: unknown) => {
		const sessionExpired = findSessionExpiredError(error);
		if (sessionExpired) throw sessionExpired;

		if (expiredStatus !== undefined && isExpiredTokenResponse(error, expiredStatus)) {
			throw new OperationalError(
				'Databricks rejected the access token and it could not be refreshed. The sign-in session has likely expired - open the credential and select Connect to sign in again.',
				{ cause: error },
			);
		}

		openAiFailedAttemptHandler(error);
	};
}
