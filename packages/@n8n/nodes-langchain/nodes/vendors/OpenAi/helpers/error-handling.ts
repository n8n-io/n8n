import { OperationalError } from 'n8n-workflow';
import { RateLimitError } from 'openai';
import { OpenAIError } from 'openai/error';

import { isRetryableRateLimitCode } from '../../../llms/error-classification';

/**
 * Custom error messages for specific OpenAI error codes.
 * Only includes non-retryable errors that need special messaging.
 */
const errorMessages: Record<string, string> = {
	insufficient_quota:
		'Insufficient quota detected. <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.openai/common-issues/#insufficient-quota" target="_blank">Learn more</a> about resolving this issue',
};

export function getCustomErrorMessage(errorCode: string): string | undefined {
	return errorMessages[errorCode];
}

export function isOpenAiError(error: unknown): error is OpenAIError {
	return error instanceof OpenAIError;
}

function isNonChatModelError(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) {
		return false;
	}
	return (
		'status' in error &&
		error.status === 404 &&
		'type' in error &&
		error.type === 'invalid_request_error' &&
		'param' in error &&
		error.param === 'model' &&
		'message' in error &&
		typeof error.message === 'string' &&
		error.message.includes('not a chat model')
	);
}

/**
 * OpenAI-specific failed attempt handler.
 *
 * This handler processes OpenAI errors and determines if they should
 * prevent retries. It works in conjunction with the centralized
 * error classification logic.
 *
 * Behavior:
 * - Non-chat model errors: Throws with helpful message (non-retryable)
 * - Rate limit with quota issues: Throws with custom message (non-retryable)
 * - Rate limit (temporary): Returns without throwing (allows retry)
 * - Other errors: Returns without throwing (default handling applies)
 *
 * @param error - The error from a failed OpenAI request
 * @throws OperationalError for non-retryable OpenAI-specific errors
 */
export const openAiFailedAttemptHandler = (error: unknown) => {
	// Handle non-chat model errors with a helpful message
	if (isNonChatModelError(error)) {
		throw new OperationalError(
			'This model requires the Responses API. Enable "Use Responses API" in the OpenAI Chat Model node options to use this model.',
			{ cause: error },
		);
	}

	// Handle OpenAI rate limit errors
	if (error instanceof RateLimitError) {
		const errorCode = error.code ?? undefined;

		// Only throw for non-retryable rate limit codes (e.g., quota exhausted)
		// Temporary rate limits (429) should be retried
		if (!isRetryableRateLimitCode(errorCode)) {
			const errorMessage = getCustomErrorMessage(errorCode!);
			throw new OperationalError(errorMessage ?? 'OpenAI rate limit error', { cause: error });
		}

		// For retryable rate limits, return without throwing to allow retry
		return;
	}

	// For other errors, return without throwing
	// The default handler will apply standard retry classification
};
