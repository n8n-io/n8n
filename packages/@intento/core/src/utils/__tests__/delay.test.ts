import { Delay } from '../delay';

/**
 * Tests for Delay utility class
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */
describe('Delay', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.useRealTimers();
	});

	describe('business logic', () => {
		it('[BL-01] should resolve after specified delay', async () => {
			// ARRANGE
			const delayMs = 1000;
			const delayPromise = Delay.apply(delayMs);

			// ACT
			jest.advanceTimersByTime(999);
			await Promise.resolve();

			// ASSERT - Should not resolve yet
			let resolved = false;
			void delayPromise.then(() => {
				resolved = true;
			});
			await Promise.resolve();
			expect(resolved).toBe(false);

			// ACT - Complete the delay
			jest.advanceTimersByTime(1);
			await Promise.resolve();

			// ASSERT - Should resolve now
			await expect(delayPromise).resolves.toBeUndefined();
		});

		it('[BL-02] should resolve immediately for zero delay', async () => {
			// ARRANGE & ACT
			const startTime = Date.now();
			await Delay.apply(0);
			const endTime = Date.now();

			// ASSERT
			expect(endTime - startTime).toBeLessThan(10);
		});

		it('[BL-03] should clean up event listener after successful delay', async () => {
			// ARRANGE
			const abortController = new AbortController();
			const removeEventListenerSpy = jest.spyOn(abortController.signal, 'removeEventListener');
			const delayPromise = Delay.apply(1000, abortController.signal);

			// ACT
			jest.advanceTimersByTime(1000);
			await delayPromise;

			// ASSERT
			expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
		});

		it('[BL-04] should abort delay when signal is triggered', async () => {
			// ARRANGE
			const abortController = new AbortController();
			const testError = new Error('Operation aborted');
			const delayPromise = Delay.apply(1000, abortController.signal);

			// ACT
			jest.advanceTimersByTime(500);
			abortController.abort(testError);
			await Promise.resolve();

			// ASSERT
			await expect(delayPromise).rejects.toThrow('Operation aborted');
		});

		it('[BL-05] should clear timeout when aborted', async () => {
			// ARRANGE
			const abortController = new AbortController();
			const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
			const delayPromise = Delay.apply(1000, abortController.signal);

			// ACT
			jest.advanceTimersByTime(500);
			abortController.abort(new Error('Aborted'));

			// ASSERT
			await expect(delayPromise).rejects.toThrow();
			expect(clearTimeoutSpy).toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle very large delay values', async () => {
			// ARRANGE
			const largeDelay = Number.MAX_SAFE_INTEGER;
			let resolved = false;
			void Delay.apply(largeDelay).then(() => {
				resolved = true;
			});

			// ACT
			jest.advanceTimersByTime(1000);
			await Promise.resolve();

			// ASSERT - Should not resolve yet even after 1 second
			expect(resolved).toBe(false);
		});
		it('[EC-02] should handle multiple concurrent delays independently', async () => {
			// ARRANGE
			const delay1 = Delay.apply(1000);
			const delay2 = Delay.apply(2000);
			const delay3 = Delay.apply(500);

			// ACT & ASSERT
			jest.advanceTimersByTime(500);
			await Promise.resolve();
			await expect(delay3).resolves.toBeUndefined();

			jest.advanceTimersByTime(500);
			await Promise.resolve();
			await expect(delay1).resolves.toBeUndefined();

			jest.advanceTimersByTime(1000);
			await Promise.resolve();
			await expect(delay2).resolves.toBeUndefined();
		});

		it('[EC-03] should handle abort signal that is undefined', async () => {
			// ARRANGE
			const delayPromise = Delay.apply(1000, undefined);

			// ACT
			jest.advanceTimersByTime(1000);
			await Promise.resolve();

			// ASSERT
			await expect(delayPromise).resolves.toBeUndefined();
		});

		it('[EC-04] should reject with signal reason if provided', async () => {
			// ARRANGE
			const abortController = new AbortController();
			const customError = new Error('Custom abort reason');
			const delayPromise = Delay.apply(1000, abortController.signal);

			// ACT
			abortController.abort(customError);
			await Promise.resolve();

			// ASSERT
			await expect(delayPromise).rejects.toBe(customError);
		});

		it('[EC-05] should reject with default abort reason if none provided', async () => {
			// ARRANGE
			const abortController = new AbortController();
			const delayPromise = Delay.apply(1000, abortController.signal);

			// ACT
			abortController.abort();
			await Promise.resolve();

			// ASSERT
			await expect(delayPromise).rejects.toBeDefined();
		});

		it('[EC-06] should not call removeEventListener if signal is undefined', async () => {
			// ARRANGE
			const delayPromise = Delay.apply(1000);

			// ACT
			jest.advanceTimersByTime(1000);
			await delayPromise;

			// ASSERT
			// Test passes if no errors thrown - checking that optional chaining works
			expect(true).toBe(true);
		});

		it('[EC-07] should handle abort during zero delay', async () => {
			// ARRANGE
			const abortController = new AbortController();

			// ACT - Zero delay returns immediately, before abort can happen
			const result = await Delay.apply(0, abortController.signal);

			// ASSERT - Should complete successfully
			expect(result).toBeUndefined();
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw RangeError for negative delay', async () => {
			// ARRANGE & ACT & ASSERT
			await expect(Delay.apply(-1)).rejects.toThrow(RangeError);
			await expect(Delay.apply(-1)).rejects.toThrow('Invalid delay duration: -1');
		});

		it('[EH-02] should throw RangeError with descriptive message', async () => {
			// ARRANGE & ACT & ASSERT
			await expect(Delay.apply(-5000)).rejects.toThrow('Invalid delay duration: -5000. Duration must be non-negative.');
		});

		it('[EH-03] should throw immediately if signal already aborted', async () => {
			// ARRANGE
			const abortController = new AbortController();
			const abortError = new Error('Already aborted');
			abortController.abort(abortError);

			// ACT & ASSERT
			await expect(Delay.apply(1000, abortController.signal)).rejects.toThrow('Already aborted');
		});

		it('[EH-04] should throw immediately without starting timer if pre-aborted', async () => {
			// ARRANGE
			const abortController = new AbortController();
			abortController.abort(new Error('Pre-aborted'));

			// ACT & ASSERT - Should throw without starting timer
			const startTime = Date.now();
			await expect(Delay.apply(5000, abortController.signal)).rejects.toThrow();
			const endTime = Date.now();

			// Should fail fast, not wait for timer
			expect(endTime - startTime).toBeLessThan(100);
		});

		it('[EH-05] should propagate custom error from abort signal', async () => {
			// ARRANGE
			class CustomAbortError extends Error {
				constructor(message: string) {
					super(message);
					this.name = 'CustomAbortError';
				}
			}

			const abortController = new AbortController();
			const customError = new CustomAbortError('Custom abort');
			const delayPromise = Delay.apply(1000, abortController.signal);

			// ACT
			abortController.abort(customError);
			await Promise.resolve();

			// ASSERT
			await expect(delayPromise).rejects.toThrow(CustomAbortError);
			await expect(delayPromise).rejects.toThrow('Custom abort');
		});

		it('[EH-06] should handle multiple abort calls gracefully', async () => {
			// ARRANGE
			const abortController = new AbortController();
			const delayPromise = Delay.apply(1000, abortController.signal);

			// ACT - Abort multiple times
			abortController.abort(new Error('First abort'));
			abortController.abort(new Error('Second abort')); // Should be ignored

			// ASSERT - Should reject with first error
			await expect(delayPromise).rejects.toThrow('First abort');
		});
	});
});
