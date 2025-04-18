import { retry } from './retry';

describe('retry', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllTimers();
	});

	it('should resolve true when the function eventually returns true', async () => {
		let callCount = 0;
		const fn = vi.fn(async () => {
			callCount++;
			// Return true on the second attempt.
			return callCount === 2;
		});

		const promise = retry(fn, 1000, 2);

		// The first call happens immediately.
		expect(fn).toHaveBeenCalledTimes(1);

		// Advance timers by 1000ms asynchronously to allow the waiting period to complete.
		await vi.advanceTimersByTimeAsync(1000);

		// After advancing, the second attempt should have occurred.
		expect(fn).toHaveBeenCalledTimes(2);

		// The promise should now resolve with true.
		const result = await promise;
		expect(result).toBe(true);
	});

	it('should resolve false if maximum retries are reached with no success', async () => {
		let callCount = 0;
		const fn = vi.fn(async () => {
			callCount++;
			return false;
		});

		const promise = retry(fn, 1000, 3);

		// The first attempt fires immediately.
		expect(fn).toHaveBeenCalledTimes(1);

		// Advance timers for the delay after the first attempt.
		await vi.advanceTimersByTimeAsync(1000);
		expect(fn).toHaveBeenCalledTimes(2);

		// Advance timers for the delay after the second attempt.
		await vi.advanceTimersByTimeAsync(1000);
		expect(fn).toHaveBeenCalledTimes(3);

		// With maxRetries reached (3 calls), promise should resolve to false.
		const result = await promise;
		expect(result).toBe(false);
	});

	it('should reject if the function throws an error', async () => {
		const fn = vi.fn(async () => {
			throw new Error('Test error'); // eslint-disable-line n8n-local-rules/no-plain-errors
		});

		// Since the error is thrown on the first call, no timer advancement is needed.
		await expect(retry(fn, 1000, 3)).rejects.toThrow('Test error');
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
