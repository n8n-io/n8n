/**
 * Error classification utilities for LLM retry logic.
 *
 * This module provides centralized logic for determining whether errors
 * should be retried or should fail immediately.
 */

/**
 * HTTP status codes that should NOT be retried.
 * These are typically client errors that won't resolve with retries.
 */
export const NON_RETRYABLE_STATUS_CODES = [
	400, // Bad Request
	401, // Unauthorized
	402, // Payment Required
	403, // Forbidden
	404, // Not Found
	405, // Method Not Allowed
	406, // Not Acceptable
	407, // Proxy Authentication Required
	409, // Conflict
] as const;

/**
 * Error codes that indicate non-retryable rate limit conditions.
 * These are typically billing/quota issues that won't resolve with retries.
 */
export const NON_RETRYABLE_RATE_LIMIT_CODES = [
	'insufficient_quota', // Billing/quota exhausted - requires payment
] as const;

/**
 * Error names/messages that indicate the request was intentionally cancelled.
 * These should not be retried as they represent user/system intent.
 */
const CANCELLATION_INDICATORS = ['Cancel', 'AbortError'] as const;

export interface ErrorWithStatus {
	status?: number;
	response?: { status?: number };
}

export interface ErrorWithCode {
	code?: string;
}

export interface ErrorWithMessage {
	message?: string;
	name?: string;
}

/**
 * Extracts the HTTP status code from an error object.
 * Handles various error shapes from different HTTP libraries.
 */
export function getErrorStatus(error: unknown): number | undefined {
	if (typeof error !== 'object' || error === null) {
		return undefined;
	}

	const errorWithStatus = error as ErrorWithStatus;
	return errorWithStatus.response?.status ?? errorWithStatus.status;
}

/**
 * Extracts the error code from an error object (e.g., OpenAI error codes).
 */
export function getErrorCode(error: unknown): string | undefined {
	if (typeof error !== 'object' || error === null) {
		return undefined;
	}

	return (error as ErrorWithCode).code;
}

/**
 * Checks if an error represents a cancelled/aborted request.
 * These should not be retried as they represent intentional cancellation.
 */
export function isCancellationError(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) {
		return false;
	}

	const errorWithMessage = error as ErrorWithMessage;

	// Check error name
	if (errorWithMessage.name === 'AbortError') {
		return true;
	}

	// Check error message prefix
	if (typeof errorWithMessage.message === 'string') {
		return CANCELLATION_INDICATORS.some((indicator) =>
			errorWithMessage.message?.startsWith(indicator),
		);
	}

	return false;
}

/**
 * Checks if an error represents a connection abort.
 */
export function isConnectionAbortError(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) {
		return false;
	}

	return (error as ErrorWithCode).code === 'ECONNABORTED';
}

/**
 * Checks if an HTTP status code is retryable.
 * Returns true for server errors (5xx) and rate limits (429).
 * Returns false for client errors that won't resolve with retries.
 */
export function isRetryableStatusCode(status: number | undefined): boolean {
	if (status === undefined) {
		return true; // Unknown status - allow retry
	}

	// Non-retryable status codes (client errors that won't fix themselves)
	if (NON_RETRYABLE_STATUS_CODES.includes(status as (typeof NON_RETRYABLE_STATUS_CODES)[number])) {
		return false;
	}

	// 429 (Too Many Requests) IS retryable - it's a temporary condition
	// 5xx errors are retryable - server issues may resolve
	return true;
}

/**
 * Checks if a rate limit error code is retryable.
 * Some rate limit errors (like quota exhaustion) are not retryable.
 */
export function isRetryableRateLimitCode(code: string | undefined): boolean {
	if (!code) {
		return true; // Unknown code - allow retry
	}

	return !NON_RETRYABLE_RATE_LIMIT_CODES.includes(
		code as (typeof NON_RETRYABLE_RATE_LIMIT_CODES)[number],
	);
}

export interface RetryClassification {
	retryable: boolean;
	reason?: string;
}

/**
 * Classifies an error to determine if it should be retried.
 *
 * @param error - The error to classify
 * @returns Classification result with retryable flag and optional reason
 *
 * @example
 * ```typescript
 * const result = classifyError(error);
 * if (!result.retryable) {
 *   throw new Error(`Non-retryable error: ${result.reason}`);
 * }
 * // Allow retry...
 * ```
 */
export function classifyError(error: unknown): RetryClassification {
	// Cancellation errors should not be retried
	if (isCancellationError(error)) {
		return { retryable: false, reason: 'Request was cancelled' };
	}

	// Connection abort errors should not be retried
	if (isConnectionAbortError(error)) {
		return { retryable: false, reason: 'Connection was aborted' };
	}

	// Check HTTP status code
	const status = getErrorStatus(error);
	if (!isRetryableStatusCode(status)) {
		return { retryable: false, reason: `HTTP ${status} is not retryable` };
	}

	// Check error code (for rate limit classification)
	const code = getErrorCode(error);
	if (!isRetryableRateLimitCode(code)) {
		return { retryable: false, reason: `Error code '${code}' is not retryable` };
	}

	return { retryable: true };
}

/**
 * Simple helper to check if an error is retryable.
 *
 * @param error - The error to check
 * @returns true if the error should be retried, false otherwise
 */
export function isRetryableError(error: unknown): boolean {
	return classifyError(error).retryable;
}
