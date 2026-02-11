import type { INode } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

import type { ResolvedRateLimitOptions } from './types';

interface HttpError {
	httpCode?: string;
	response?: {
		headers?: Record<string, string>;
	};
}

function isHttpError(error: unknown): error is HttpError {
	return typeof error === 'object' && error !== null && 'httpCode' in error;
}

/**
 * Wraps an async function with retry logic for HTTP 429 (rate limit) responses.
 *
 * Reads the `retry-after` header when available, otherwise uses exponential backoff.
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	opts: ResolvedRateLimitOptions,
	getNode: () => INode,
): Promise<T> {
	for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error: unknown) {
			if (isHttpError(error) && error.httpCode === '429' && attempt < opts.maxRetries) {
				const retryAfter = error.response?.headers?.[opts.retryAfterHeader];
				const delay = retryAfter
					? parseInt(retryAfter, 10) * 1000
					: opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt);
				await sleep(delay);
				continue;
			}
			throw error;
		}
	}
	throw new NodeOperationError(getNode(), 'Max retries exceeded');
}
