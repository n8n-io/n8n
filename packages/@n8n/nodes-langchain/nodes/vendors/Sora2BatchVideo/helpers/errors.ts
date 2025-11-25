/**
 * Sora2 Batch Video - Error Classification
 */

import type { Provider } from './interfaces';

/**
 * Error categories for classification
 */
export enum ErrorCategory {
	RETRYABLE = 'retryable',
	NON_RETRYABLE = 'non_retryable',
	RATE_LIMITED = 'rate_limited',
	PROVIDER_DOWN = 'provider_down',
	TIMEOUT = 'timeout',
}

/**
 * Classified error with metadata
 */
export interface ClassifiedError {
	category: ErrorCategory;
	message: string;
	provider: Provider;
	retryable: boolean;
	shouldFailover: boolean;
	retryAfterMs?: number;
	httpStatus?: number;
}

/**
 * Classify an error for retry and failover logic
 */
export function classifyError(
	error: unknown,
	provider: Provider,
	httpStatus?: number,
): ClassifiedError {
	// Rate limiting - 429
	if (httpStatus === 429) {
		return {
			category: ErrorCategory.RATE_LIMITED,
			message: 'Rate limit exceeded',
			provider,
			retryable: true,
			shouldFailover: false,
			retryAfterMs: 60000,
			httpStatus,
		};
	}

	// Server errors (5xx) - trigger failover
	if (httpStatus && httpStatus >= 500) {
		return {
			category: ErrorCategory.PROVIDER_DOWN,
			message: `Server error: ${httpStatus}`,
			provider,
			retryable: true,
			shouldFailover: true,
			httpStatus,
		};
	}

	// Auth errors - try failover
	if (httpStatus === 401 || httpStatus === 403) {
		return {
			category: ErrorCategory.NON_RETRYABLE,
			message: 'Authentication failed - check credentials',
			provider,
			retryable: false,
			shouldFailover: true,
			httpStatus,
		};
	}

	// Client errors (4xx) - non-retryable, don't failover
	if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
		return {
			category: ErrorCategory.NON_RETRYABLE,
			message: `Client error: ${httpStatus}`,
			provider,
			retryable: false,
			shouldFailover: false,
			httpStatus,
		};
	}

	// Timeout errors
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		if (message.includes('timeout') || message.includes('etimedout')) {
			return {
				category: ErrorCategory.TIMEOUT,
				message: 'Request timed out',
				provider,
				retryable: true,
				shouldFailover: true,
			};
		}

		// Network errors - trigger failover
		if (message.includes('econnrefused') || message.includes('enotfound')) {
			return {
				category: ErrorCategory.PROVIDER_DOWN,
				message: 'Cannot reach provider',
				provider,
				retryable: true,
				shouldFailover: true,
			};
		}
	}

	// Default: treat as retryable
	return {
		category: ErrorCategory.RETRYABLE,
		message: error instanceof Error ? error.message : String(error),
		provider,
		retryable: true,
		shouldFailover: false,
	};
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoff(
	attempt: number,
	initialDelayMs: number = 1000,
	maxDelayMs: number = 60000,
	multiplier: number = 2,
): number {
	const baseDelay = Math.min(initialDelayMs * Math.pow(multiplier, attempt - 1), maxDelayMs);
	const jitter = baseDelay * 0.2 * Math.random();
	return Math.floor(baseDelay + jitter);
}
