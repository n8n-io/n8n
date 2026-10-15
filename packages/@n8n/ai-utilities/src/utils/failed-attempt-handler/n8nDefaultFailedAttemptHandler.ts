import { classifyRateLimitError } from '@langchain/core/utils/async_caller';

const STATUS_NO_RETRY = [
	400, // Bad Request
	401, // Unauthorized
	402, // Payment Required
	403, // Forbidden
	404, // Not Found
	405, // Method Not Allowed
	406, // Not Acceptable
	407, // Proxy Authentication Required
	409, // Conflict
	413, // Payload Too Large
];

/**
 * This function is used as a default handler for failed attempts in all LLMs.
 * It is based on a default handler from the langchain core package.
 * It throws an error when it encounters a known error that should not be retried.
 * A 429 is classified by `classifyRateLimitError`: it is not retried when the code or message
 * signals an exhausted quota, or when Retry-After is over 60 s. Other 429s are retried, and a
 * Retry-After within that limit is copied to `retryAfterMs` so the retry loop waits that long.
 * @param error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const n8nDefaultFailedAttemptHandler = (error: any) => {
	if (
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
		error?.message?.startsWith?.('Cancel') ||
		error?.message?.startsWith?.('AbortError') ||
		error?.name === 'AbortError'
	) {
		throw error;
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	if (error?.code === 'ECONNABORTED') {
		throw error;
	}

	const status =
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		error?.response?.status ?? error?.status;
	if (status && STATUS_NO_RETRY.includes(+status)) {
		throw error;
	}

	const rateLimit = classifyRateLimitError(error);
	if (rateLimit) {
		if (rateLimit.action === 'stop') throw error;
		if (rateLimit.action === 'capacity' && rateLimit.retryAfterMs !== undefined) throw error;
		if (rateLimit.retryAfterMs !== undefined) {
			Object.assign(error, { retryAfterMs: rateLimit.retryAfterMs });
		}
	}
};
