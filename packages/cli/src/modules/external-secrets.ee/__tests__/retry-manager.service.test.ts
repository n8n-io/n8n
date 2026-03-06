import { mockLogger } from '@n8n/backend-test-utils';

import { EXTERNAL_SECRETS_INITIAL_BACKOFF, EXTERNAL_SECRETS_MAX_BACKOFF } from '../constants';
import { ExternalSecretsRetryManager } from '../retry-manager.service';

describe('RetryManager', () => {
	jest.useFakeTimers();

	let retryManager: ExternalSecretsRetryManager;

	beforeEach(() => {
		retryManager = new ExternalSecretsRetryManager(mockLogger());
	});

	afterEach(() => {
		jest.clearAllTimers();
		retryManager.cancelAll();
	});

	describe('runWithRetry', () => {
		it('should return success result when operation succeeds', async () => {
			const successOperation = jest.fn().mockResolvedValue({ success: true });

			const result = await retryManager.runWithRetry('test-key', successOperation);

			expect(result).toEqual({ success: true });
			expect(successOperation).toHaveBeenCalledTimes(1);
			expect(retryManager.isRetrying('test-key')).toBe(false);
		});

		it('should schedule retry when operation fails', async () => {
			const error = new Error('Connection failed');
			const failOperation = jest.fn().mockResolvedValue({ success: false, error });

			const result = await retryManager.runWithRetry('test-key', failOperation);

			expect(result).toEqual({ success: false, error });
			expect(failOperation).toHaveBeenCalledTimes(1);
			expect(retryManager.isRetrying('test-key')).toBe(true);
		});

		it('should retry with exponential backoff', async () => {
			const error = new Error('Connection failed');
			const failOperation = jest
				.fn()
				.mockResolvedValueOnce({ success: false, error })
				.mockResolvedValueOnce({ success: false, error })
				.mockResolvedValueOnce({ success: true });

			// Initial attempt fails
			await retryManager.runWithRetry('test-key', failOperation);
			expect(failOperation).toHaveBeenCalledTimes(1);

			// First retry (5000ms)
			jest.advanceTimersByTime(EXTERNAL_SECRETS_INITIAL_BACKOFF);
			await Promise.resolve(); // Let promises resolve
			expect(failOperation).toHaveBeenCalledTimes(2);

			// Second retry (10000ms)
			jest.advanceTimersByTime(EXTERNAL_SECRETS_INITIAL_BACKOFF * 2);
			await Promise.resolve();
			expect(failOperation).toHaveBeenCalledTimes(3);

			// Should not retry after success
			expect(retryManager.isRetrying('test-key')).toBe(false);
		});

		it('should cap backoff at maximum value', async () => {
			const error = new Error('Connection failed');
			const failOperation = jest.fn().mockResolvedValue({ success: false, error });

			await retryManager.runWithRetry('test-key', failOperation);

			// Advance through multiple retries to hit max backoff
			for (let i = 0; i < 10; i++) {
				jest.advanceTimersByTime(EXTERNAL_SECRETS_MAX_BACKOFF);
				await Promise.resolve();
			}

			const retryInfo = retryManager.getRetryInfo('test-key');
			expect(retryInfo?.nextBackoff).toBe(EXTERNAL_SECRETS_MAX_BACKOFF);
		});
	});

	describe('cancelRetry', () => {
		it('should cancel scheduled retry', async () => {
			const failOperation = jest
				.fn()
				.mockResolvedValue({ success: false, error: new Error('Failed') });

			await retryManager.runWithRetry('test-key', failOperation);
			expect(retryManager.isRetrying('test-key')).toBe(true);

			const result = retryManager.cancelRetry('test-key');

			expect(result).toBe(true);
			expect(retryManager.isRetrying('test-key')).toBe(false);

			// Advance time - operation should not be called again
			jest.advanceTimersByTime(EXTERNAL_SECRETS_INITIAL_BACKOFF);
			await Promise.resolve();
			expect(failOperation).toHaveBeenCalledTimes(1);
		});

		it('should return false when canceling non-existent retry', () => {
			const result = retryManager.cancelRetry('non-existent');

			expect(result).toBe(false);
		});

		it('should replace existing retry when scheduling new one for same key', async () => {
			const operation1 = jest
				.fn()
				.mockResolvedValue({ success: false, error: new Error('Failed') });
			const operation2 = jest
				.fn()
				.mockResolvedValue({ success: false, error: new Error('Failed') });

			await retryManager.runWithRetry('test-key', operation1);
			await retryManager.runWithRetry('test-key', operation2);

			// Advance timer
			jest.advanceTimersByTime(EXTERNAL_SECRETS_INITIAL_BACKOFF);
			await Promise.resolve();

			// Only operation2 should be called on retry
			expect(operation1).toHaveBeenCalledTimes(1);
			expect(operation2).toHaveBeenCalledTimes(2);
		});
	});

	describe('cancelAll', () => {
		it('should cancel all scheduled retries', async () => {
			const operation1 = jest
				.fn()
				.mockResolvedValue({ success: false, error: new Error('Failed') });
			const operation2 = jest
				.fn()
				.mockResolvedValue({ success: false, error: new Error('Failed') });

			await retryManager.runWithRetry('key1', operation1);
			await retryManager.runWithRetry('key2', operation2);

			expect(retryManager.isRetrying('key1')).toBe(true);
			expect(retryManager.isRetrying('key2')).toBe(true);

			retryManager.cancelAll();

			expect(retryManager.isRetrying('key1')).toBe(false);
			expect(retryManager.isRetrying('key2')).toBe(false);

			// Advance time - operations should not be called again
			jest.advanceTimersByTime(EXTERNAL_SECRETS_INITIAL_BACKOFF);
			await Promise.resolve();
			expect(operation1).toHaveBeenCalledTimes(1);
			expect(operation2).toHaveBeenCalledTimes(1);
		});

		it('should handle cancelAll when no retries are scheduled', () => {
			expect(() => retryManager.cancelAll()).not.toThrow();
		});
	});

	describe('isRetrying', () => {
		it('should return true when retry is scheduled', async () => {
			const operation = jest.fn().mockResolvedValue({ success: false, error: new Error('Failed') });

			await retryManager.runWithRetry('test-key', operation);

			expect(retryManager.isRetrying('test-key')).toBe(true);
		});

		it('should return false when no retry is scheduled', () => {
			expect(retryManager.isRetrying('test-key')).toBe(false);
		});

		it('should return false after successful retry', async () => {
			const operation = jest
				.fn()
				.mockResolvedValueOnce({ success: false, error: new Error('Failed') })
				.mockResolvedValueOnce({ success: true });

			await retryManager.runWithRetry('test-key', operation);
			expect(retryManager.isRetrying('test-key')).toBe(true);

			jest.advanceTimersByTime(EXTERNAL_SECRETS_INITIAL_BACKOFF);
			await Promise.resolve();

			expect(retryManager.isRetrying('test-key')).toBe(false);
		});
	});

	describe('getRetryInfo', () => {
		it('should return retry information for scheduled retry', async () => {
			const operation = jest.fn().mockResolvedValue({ success: false, error: new Error('Failed') });

			await retryManager.runWithRetry('test-key', operation);

			const info = retryManager.getRetryInfo('test-key');

			expect(info).toEqual({
				attempt: 1,
				nextBackoff: EXTERNAL_SECRETS_INITIAL_BACKOFF * 2,
			});
		});

		it('should return undefined for non-existent retry', () => {
			const info = retryManager.getRetryInfo('non-existent');

			expect(info).toBeUndefined();
		});

		it('should track increasing backoff value', async () => {
			const operation = jest.fn().mockResolvedValue({ success: false, error: new Error('Failed') });

			await retryManager.runWithRetry('test-key', operation);

			const info = retryManager.getRetryInfo('test-key');
			expect(info?.attempt).toBe(1);
			expect(info?.nextBackoff).toBe(EXTERNAL_SECRETS_INITIAL_BACKOFF * 2);
		});
	});
});
