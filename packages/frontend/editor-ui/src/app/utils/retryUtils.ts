/**
 * Initial delay for exponential backoff in milliseconds
 */
export const RETRY_START_DELAY = 2000;

/**
 * Maximum delay for exponential backoff in milliseconds
 */
export const RETRY_MAX_DELAY = 32000;

/**
 * Calculates exponential backoff delay
 * @param retryCount - The current retry attempt (1-based)
 * @param startDelay - The initial delay in milliseconds
 * @param maxDelay - The maximum delay in milliseconds
 * @returns The calculated delay in milliseconds
 */
export function calculateExponentialBackoff(
	retryCount: number,
	startDelay: number = RETRY_START_DELAY,
	maxDelay: number = RETRY_MAX_DELAY,
): number {
	return Math.min(startDelay * Math.pow(2, retryCount - 1), maxDelay);
}
