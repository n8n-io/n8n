import { Delay } from '../delay';

describe('Delay', () => {
	describe('apply', () => {
		beforeEach(() => {
			jest.useFakeTimers();
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		describe('Business Logic', () => {
			it('should resolve after specified delay without signal', async () => {
				const delayPromise = Delay.apply(1000);

				// Advance time by 999ms - should not resolve yet
				jest.advanceTimersByTime(999);
				await Promise.resolve(); // Flush microtasks

				// Advance remaining 1ms - should resolve
				jest.advanceTimersByTime(1);
				await expect(delayPromise).resolves.toBeUndefined();
			});

			it('should resolve immediately for 0ms delay', async () => {
				const delayPromise = Delay.apply(0);

				// Should resolve without advancing timers
				await expect(delayPromise).resolves.toBeUndefined();

				// Verify no timers were scheduled
				expect(jest.getTimerCount()).toBe(0);
			});

			it('should handle multiple concurrent delays independently', async () => {
				const delay1 = Delay.apply(1000);
				const delay2 = Delay.apply(2000);
				const delay3 = Delay.apply(500);

				// Advance to 500ms - only delay3 should resolve
				jest.advanceTimersByTime(500);
				await expect(delay3).resolves.toBeUndefined();

				// delay1 and delay2 should still be pending
				expect(jest.getTimerCount()).toBe(2);

				// Advance to 1000ms total - delay1 should resolve
				jest.advanceTimersByTime(500);
				await expect(delay1).resolves.toBeUndefined();

				// delay2 should still be pending
				expect(jest.getTimerCount()).toBe(1);

				// Advance to 2000ms total - delay2 should resolve
				jest.advanceTimersByTime(1000);
				await expect(delay2).resolves.toBeUndefined();

				expect(jest.getTimerCount()).toBe(0);
			});

			it('should clean up timeout when completed normally', async () => {
				const controller = new AbortController();
				const removeEventListenerSpy = jest.spyOn(controller.signal, 'removeEventListener');

				const delayPromise = Delay.apply(1000, controller.signal);

				jest.advanceTimersByTime(1000);
				await delayPromise;

				// Verify removeEventListener was called to clean up
				expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
			});

			it('should clean up abort listener after timeout fires', async () => {
				const controller = new AbortController();
				const addEventListenerSpy = jest.spyOn(controller.signal, 'addEventListener');

				const delayPromise = Delay.apply(1000, controller.signal);

				// Verify listener was added with once: true
				expect(addEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function), {
					once: true,
				});

				jest.advanceTimersByTime(1000);
				await delayPromise;

				// Aborting after completion should not affect the resolved promise
				expect(() => controller.abort()).not.toThrow();
			});
		});

		describe('Edge Cases', () => {
			it('should throw RangeError for negative delay', async () => {
				await expect(Delay.apply(-100)).rejects.toThrow(RangeError);
				await expect(Delay.apply(-100)).rejects.toThrow('🐞 [BUG] Invalid delay duration: -100. Duration must be non-negative.');

				// Verify no timers were scheduled
				expect(jest.getTimerCount()).toBe(0);
			});

			it('should reject immediately if signal already aborted', async () => {
				const controller = new AbortController();
				const reason = new Error('Already aborted');
				controller.abort(reason);

				await expect(Delay.apply(1000, controller.signal)).rejects.toThrow('Already aborted');

				// Verify no timers were scheduled
				expect(jest.getTimerCount()).toBe(0);
			});

			it('should reject when signal aborts during delay', async () => {
				const controller = new AbortController();
				const delayPromise = Delay.apply(2000, controller.signal);

				// Advance halfway through delay
				jest.advanceTimersByTime(1000);

				// Abort the signal
				const reason = new Error('Operation cancelled');
				controller.abort(reason);

				await expect(delayPromise).rejects.toThrow('Operation cancelled');
			});

			it('should reject with signal reason when aborted', async () => {
				const controller = new AbortController();
				const customReason = new Error('Custom abort reason');
				const delayPromise = Delay.apply(1000, controller.signal);

				controller.abort(customReason);

				await expect(delayPromise).rejects.toBe(customReason);
			});

			it('should handle signal without reason (undefined)', async () => {
				const controller = new AbortController();
				const delayPromise = Delay.apply(1000, controller.signal);

				// Abort without providing a reason
				controller.abort();

				// Should reject (reason will be undefined cast as Error)
				await expect(delayPromise).rejects.toBeDefined();
			});

			it('should work with signal that never aborts', async () => {
				const controller = new AbortController();
				const delayPromise = Delay.apply(1000, controller.signal);

				jest.advanceTimersByTime(1000);
				await expect(delayPromise).resolves.toBeUndefined();

				// Signal was never aborted
				expect(controller.signal.aborted).toBe(false);
			});

			it('should handle abort at exact moment timeout fires', async () => {
				const controller = new AbortController();
				const delayPromise = Delay.apply(1000, controller.signal);

				// Advance to exact timeout moment and abort simultaneously
				jest.advanceTimersByTime(1000);
				controller.abort(new Error('Race condition'));

				// Timeout should win the race - promise resolves
				await expect(delayPromise).resolves.toBeUndefined();
			});

			it('should handle very long delays (boundary test)', async () => {
				const oneDayInMs = 24 * 60 * 60 * 1000;
				const delayPromise = Delay.apply(oneDayInMs);

				jest.advanceTimersByTime(oneDayInMs - 1);
				expect(jest.getTimerCount()).toBe(1);

				jest.advanceTimersByTime(1);
				await expect(delayPromise).resolves.toBeUndefined();
			});
		});

		describe('Error Handling', () => {
			it('should clear timeout when abort fires', async () => {
				const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
				const controller = new AbortController();
				const delayPromise = Delay.apply(2000, controller.signal);

				// Abort before timeout completes
				jest.advanceTimersByTime(500);
				controller.abort(new Error('Cancelled'));

				await expect(delayPromise).rejects.toThrow('Cancelled');

				// Verify clearTimeout was called
				expect(clearTimeoutSpy).toHaveBeenCalled();

				clearTimeoutSpy.mockRestore();
			});

			it('should remove listener via once:true after abort', async () => {
				const controller = new AbortController();
				const addEventListenerSpy = jest.spyOn(controller.signal, 'addEventListener');

				const delayPromise = Delay.apply(1000, controller.signal);

				// Verify once: true was set
				expect(addEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function), {
					once: true,
				});

				controller.abort(new Error('Test abort'));
				await expect(delayPromise).rejects.toThrow('Test abort');

				// The listener should have been automatically removed by { once: true }
				// Subsequent aborts should not affect anything
				expect(() => controller.abort()).not.toThrow();
			});

			it('should handle AbortError correctly', async () => {
				const controller = new AbortController();
				const delayPromise = Delay.apply(1000, controller.signal);

				const abortError = new DOMException('The operation was aborted', 'AbortError');
				controller.abort(abortError);

				await expect(delayPromise).rejects.toMatchObject({
					name: 'AbortError',
					message: 'The operation was aborted',
				});
			});

			it('should not leak listeners on repeated delays', async () => {
				const controller = new AbortController();

				// Run multiple delays with the same signal
				for (let i = 0; i < 5; i++) {
					const delayPromise = Delay.apply(100, controller.signal);
					jest.advanceTimersByTime(100);
					await delayPromise;
				}

				// If listeners aren't cleaned up, they would accumulate
				// We verify this by checking the signal still works normally
				const finalDelay = Delay.apply(100, controller.signal);
				controller.abort(new Error('Final abort'));
				await expect(finalDelay).rejects.toThrow('Final abort');
			});

			it('should handle invalid delay values gracefully', async () => {
				// Test various edge case values
				await expect(Delay.apply(-1)).rejects.toThrow(RangeError);
				await expect(Delay.apply(-0.1)).rejects.toThrow(RangeError);
				await expect(Delay.apply(-Infinity)).rejects.toThrow(RangeError);

				// Valid edge cases
				await expect(Delay.apply(0)).resolves.toBeUndefined();

				const maxSafeInt = Delay.apply(Number.MAX_SAFE_INTEGER);
				jest.advanceTimersByTime(Number.MAX_SAFE_INTEGER);
				await expect(maxSafeInt).resolves.toBeUndefined();
			});
		});
	});
});
