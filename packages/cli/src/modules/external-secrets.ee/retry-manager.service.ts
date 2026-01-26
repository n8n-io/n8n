import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { EXTERNAL_SECRETS_INITIAL_BACKOFF, EXTERNAL_SECRETS_MAX_BACKOFF } from './constants';

type RetryOperation = () => Promise<{ success: boolean; error?: Error }>;

interface RetryInfo {
	timeout: NodeJS.Timeout;
	operation: RetryOperation;
	attempt: number;
	nextBackoff: number;
}

/**
 * Manages retry logic with exponential backoff
 * Handles scheduling, cancellation, and tracking of retries
 */
@Service()
export class ExternalSecretsRetryManager {
	private retries = new Map<string, RetryInfo>();

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('external-secrets');
	}

	async runWithRetry(
		key: string,
		operation: RetryOperation,
	): Promise<{ success: boolean; error?: Error }> {
		// Cancel any existing retry - a new manual attempt supersedes scheduled retries
		this.cancelRetry(key);

		const result = await operation();
		if (result.success) {
			return result;
		}

		this.logger.error(`Operation failed for ${key}`, { error: result.error });
		this.scheduleRetry(key, operation);
		return { success: false, error: result.error };
	}

	/**
	 * Schedule a retry with exponential backoff
	 */
	private scheduleRetry(
		key: string,
		operation: RetryOperation,
		currentBackoff = EXTERNAL_SECRETS_INITIAL_BACKOFF,
		attempt = 0,
	): void {
		const nextBackoff = Math.min(currentBackoff * 2, EXTERNAL_SECRETS_MAX_BACKOFF);

		const timeout = setTimeout(async () => {
			this.logger.debug(`Retrying operation for ${key} (attempt ${attempt + 1})`);
			this.retries.delete(key);

			const result = await operation();
			if (result.success) {
				this.logger.debug(`Operation for ${key} succeeded on retry attempt ${attempt + 1}`);
				return;
			}

			this.logger.error(`Retry failed for ${key}`, { error: result.error });
			this.scheduleRetry(key, operation, nextBackoff, attempt + 1);
		}, currentBackoff);

		this.retries.set(key, {
			timeout,
			operation,
			attempt: attempt + 1,
			nextBackoff,
		});

		this.logger.debug(`Scheduled retry for ${key} in ${currentBackoff}ms (attempt ${attempt + 1})`);
	}

	/**
	 * Cancel a scheduled retry
	 */
	cancelRetry(key: string): boolean {
		const retryInfo = this.retries.get(key);
		if (!retryInfo) {
			return false;
		}

		clearTimeout(retryInfo.timeout);
		this.retries.delete(key);
		this.logger.debug(`Cancelled retry for ${key}`);
		return true;
	}

	/**
	 * Cancel all scheduled retries
	 */
	cancelAll(): void {
		for (const [key, retryInfo] of this.retries.entries()) {
			clearTimeout(retryInfo.timeout);
			this.logger.debug(`Cancelled retry for ${key}`);
		}
		this.retries.clear();
	}

	/**
	 * Check if a retry is scheduled for a key
	 */
	isRetrying(key: string): boolean {
		return this.retries.has(key);
	}

	/**
	 * Get retry information for a key
	 */
	getRetryInfo(key: string): { attempt: number; nextBackoff: number } | undefined {
		const retryInfo = this.retries.get(key);
		if (!retryInfo) {
			return undefined;
		}
		return {
			attempt: retryInfo.attempt,
			nextBackoff: retryInfo.nextBackoff,
		};
	}
}
