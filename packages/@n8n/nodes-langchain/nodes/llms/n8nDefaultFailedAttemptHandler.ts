import { classifyError } from './error-classification';

/**
 * This function is used as a default handler for failed attempts in all LLMs.
 * It is based on a default handler from the langchain core package.
 * It throws an error when it encounters a known error that should not be retried.
 *
 * Uses centralized error classification logic from error-classification.ts
 * to determine retryability based on:
 * - HTTP status codes (4xx client errors are not retried, except 429)
 * - Cancellation/abort signals
 * - Connection errors
 *
 * @param error - The error from a failed LLM request
 * @throws The original error if it should not be retried
 */
export const n8nDefaultFailedAttemptHandler = (error: unknown) => {
	const classification = classifyError(error);

	if (!classification.retryable) {
		throw error;
	}
};
