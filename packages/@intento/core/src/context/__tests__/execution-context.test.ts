import 'reflect-metadata';

import { ExecutionContext } from '../execution-context';

/**
 * Tests for ExecutionContext
 * @author Claude Sonnet 4.5
 * @date 2025-12-30
 */

describe('ExecutionContext', () => {
	describe('business logic', () => {
		it('[BL-01] should create context with default values', () => {
			// ARRANGE & ACT
			const context = new ExecutionContext();

			// ASSERT
			expect(context.maxAttempts).toBe(5);
			expect(context.maxDelayMs).toBe(5000);
			expect(context.maxJitter).toBe(0.2);
			expect(context.timeoutMs).toBe(10000);
		});

		it('[BL-02] should create context with custom values', () => {
			// ARRANGE & ACT
			const context = new ExecutionContext(10, 20000, 0.5, 30000);

			// ASSERT
			expect(context.maxAttempts).toBe(10);
			expect(context.maxDelayMs).toBe(20000);
			expect(context.maxJitter).toBe(0.5);
			expect(context.timeoutMs).toBe(30000);
		});

		it('[BL-03] should freeze instance after construction', () => {
			// ARRANGE & ACT
			const context = new ExecutionContext();

			// ASSERT
			expect(Object.isFrozen(context)).toBe(true);

			// Verify property modification fails
			expect(() => {
				(context as { maxAttempts: number }).maxAttempts = 99;
			}).toThrow();
		});

		it('[BL-04] should calculate delay for first attempt', () => {
			// ARRANGE
			const context = new ExecutionContext();

			// ACT
			const delay = context.calculateDelay(0);

			// ASSERT
			expect(delay).toBe(0);
		});

		it('[BL-05] should calculate delay with exponential backoff', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 10000);
			const baseDelay = 5000 / 2 ** 4; // 312.5ms
			const maxJitterMs = 0.2 * baseDelay; // 62.5ms

			// ACT & ASSERT - attempt 1
			const delay1 = context.calculateDelay(1);
			expect(delay1).toBeGreaterThanOrEqual(baseDelay * 2 - maxJitterMs); // ~562ms
			expect(delay1).toBeLessThanOrEqual(baseDelay * 2 + maxJitterMs); // ~688ms

			// ACT & ASSERT - attempt 2
			const delay2 = context.calculateDelay(2);
			expect(delay2).toBeGreaterThanOrEqual(baseDelay * 4 - maxJitterMs); // ~1188ms
			expect(delay2).toBeLessThanOrEqual(baseDelay * 4 + maxJitterMs); // ~1312ms

			// ACT & ASSERT - attempt 3
			const delay3 = context.calculateDelay(3);
			expect(delay3).toBeGreaterThanOrEqual(baseDelay * 8 - maxJitterMs); // ~2438ms
			expect(delay3).toBeLessThanOrEqual(baseDelay * 8 + maxJitterMs); // ~2562ms
		});

		it('[BL-06] should cap delay at maxDelayMs', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 10000);

			// ACT
			const delay = context.calculateDelay(4); // Last attempt

			// ASSERT
			expect(delay).toBeLessThanOrEqual(5000);
		});

		it('[BL-07] should create abort signal with timeout only', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 1000);

			// ACT
			const signal = context.createAbortSignal();

			// ASSERT
			expect(signal).toBeInstanceOf(AbortSignal);
			expect(signal.aborted).toBe(false);
		});

		it('[BL-08] should create abort signal with parent chain', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 5000);
			const parentController = new AbortController();
			const parentSignal = parentController.signal;

			// ACT
			const signal = context.createAbortSignal(parentSignal);

			// ASSERT
			expect(signal).toBeInstanceOf(AbortSignal);
			expect(signal.aborted).toBe(false);

			// Verify parent abort propagates
			parentController.abort();
			expect(signal.aborted).toBe(true);
		});

		it('[BL-09] should return log metadata with all properties', () => {
			// ARRANGE
			const context = new ExecutionContext(10, 20000, 0.5, 30000);

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				maxAttempts: 10,
				maxDelayMs: 20000,
				maxJitter: 0.5,
				timeoutMs: 30000,
			});
		});

		it('[BL-10] should pass validation with valid boundaries', () => {
			// ARRANGE
			const context = new ExecutionContext(25, 30000, 0.5, 300000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle minimum maxAttempts boundary', () => {
			// ARRANGE
			const context = new ExecutionContext(1, 5000, 0.2, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.maxAttempts).toBe(1);
		});

		it('[EC-02] should handle maximum maxAttempts boundary', () => {
			// ARRANGE
			const context = new ExecutionContext(50, 5000, 0.2, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.maxAttempts).toBe(50);
		});

		it('[EC-03] should handle minimum maxDelayMs boundary', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 100, 0.2, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.maxDelayMs).toBe(100);
		});

		it('[EC-04] should handle maximum maxDelayMs boundary', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 60000, 0.2, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.maxDelayMs).toBe(60000);
		});

		it('[EC-05] should handle minimum maxJitter boundary', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.1, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.maxJitter).toBe(0.1);
		});

		it('[EC-06] should handle maximum maxJitter boundary', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.9, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.maxJitter).toBe(0.9);
		});

		it('[EC-07] should handle minimum timeoutMs boundary', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 1000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.timeoutMs).toBe(1000);
		});

		it('[EC-08] should handle maximum timeoutMs boundary', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 600000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.timeoutMs).toBe(600000);
		});

		it('[EC-09] should calculate delay for last valid attempt', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 10000);

			// ACT
			const delay = context.calculateDelay(4); // maxAttempts - 1

			// ASSERT
			expect(delay).toBeGreaterThanOrEqual(0);
			expect(delay).toBeLessThanOrEqual(5000);
		});

		it('[EC-10] should handle parent signal without timeout race', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 10000);
			const parentController = new AbortController();
			parentController.abort(); // Abort immediately

			// ACT & ASSERT - should throw immediately
			expect(() => context.createAbortSignal(parentController.signal)).toThrow();
		});

		it('[EC-11] should produce positive delays with max jitter', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.9, 10000);
			const baseDelay = 5000 / 2 ** 4; // 312.5ms

			// ACT - Run multiple times to test with different random values
			const delays: number[] = [];
			for (let i = 0; i < 100; i++) {
				delays.push(context.calculateDelay(1));
			}

			// ASSERT - All delays should be positive (2^1 - 0.9 = 1.1 > 0)
			delays.forEach((delay) => {
				expect(delay).toBeGreaterThan(0);
				// Should be within theoretical bounds: baseDelay * 2 * (1 - maxJitter) to baseDelay * 2 * (1 + maxJitter)
				expect(delay).toBeGreaterThanOrEqual(baseDelay * 2 * 0.1); // ~62.5ms minimum
				expect(delay).toBeLessThanOrEqual(baseDelay * 2 * 1.9); // ~1188ms maximum
			});
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw on null maxAttempts', () => {
			// ARRANGE
			const context = new ExecutionContext(null as unknown as number, 5000, 0.2, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('maxAttempts is required for ExecutionContext');
		});

		it('[EH-02] should throw on undefined maxAttempts', () => {
			// ARRANGE
			// NOTE: TypeScript default parameter prevents passing undefined, use Object.create to bypass
			const context = Object.create(ExecutionContext.prototype) as ExecutionContext;
			(context as { maxAttempts: number | undefined }).maxAttempts = undefined;
			(context as { maxDelayMs: number }).maxDelayMs = 5000;
			(context as { maxJitter: number }).maxJitter = 0.2;
			(context as { timeoutMs: number }).timeoutMs = 10000;

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('maxAttempts is required for ExecutionContext');
		});

		it('[EH-03] should throw on null maxDelayMs', () => {
			// ARRANGE
			const context = new ExecutionContext(5, null as unknown as number, 0.2, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('maxDelayMs is required for ExecutionContext');
		});

		it('[EH-04] should throw on undefined maxDelayMs', () => {
			// ARRANGE
			// NOTE: TypeScript default parameter prevents passing undefined, use Object.create to bypass
			const context = Object.create(ExecutionContext.prototype) as ExecutionContext;
			(context as { maxAttempts: number }).maxAttempts = 5;
			(context as { maxDelayMs: number | undefined }).maxDelayMs = undefined;
			(context as { maxJitter: number }).maxJitter = 0.2;
			(context as { timeoutMs: number }).timeoutMs = 10000;

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('maxDelayMs is required for ExecutionContext');
		});

		it('[EH-05] should throw on null maxJitter', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, null as unknown as number, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('maxJitter is required for ExecutionContext');
		});

		it('[EH-06] should throw on undefined maxJitter', () => {
			// ARRANGE
			// NOTE: TypeScript default parameter prevents passing undefined, use Object.create to bypass
			const context = Object.create(ExecutionContext.prototype) as ExecutionContext;
			(context as { maxAttempts: number }).maxAttempts = 5;
			(context as { maxDelayMs: number }).maxDelayMs = 5000;
			(context as { maxJitter: number | undefined }).maxJitter = undefined;
			(context as { timeoutMs: number }).timeoutMs = 10000;

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('maxJitter is required for ExecutionContext');
		});

		it('[EH-07] should throw on null timeoutMs', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, null as unknown as number);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('timeoutMs is required for ExecutionContext');
		});

		it('[EH-08] should throw on undefined timeoutMs', () => {
			// ARRANGE
			// NOTE: TypeScript default parameter prevents passing undefined, use Object.create to bypass
			const context = Object.create(ExecutionContext.prototype) as ExecutionContext;
			(context as { maxAttempts: number }).maxAttempts = 5;
			(context as { maxDelayMs: number }).maxDelayMs = 5000;
			(context as { maxJitter: number }).maxJitter = 0.2;
			(context as { timeoutMs: number | undefined }).timeoutMs = undefined;

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('timeoutMs is required for ExecutionContext');
		});
		it('[EH-09] should throw on maxAttempts below minimum', () => {
			// ARRANGE
			const context = new ExecutionContext(0, 5000, 0.2, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('maxAttempts must be at least 1, but got 0');
		});

		it('[EH-10] should throw on maxAttempts above maximum', () => {
			// ARRANGE
			const context = new ExecutionContext(51, 5000, 0.2, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('maxAttempts must be at most 50, but got 51');
		});

		it('[EH-11] should throw on maxDelayMs below minimum', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 99, 0.2, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('maxDelayMs must be at least 100, but got 99');
		});

		it('[EH-12] should throw on maxDelayMs above maximum', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 60001, 0.2, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('maxDelayMs must be at most 60000, but got 60001');
		});

		it('[EH-13] should throw on maxJitter below minimum', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.09, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('maxJitter must be at least 0.1, but got 0.09');
		});

		it('[EH-14] should throw on maxJitter above maximum', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.91, 10000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('maxJitter must be at most 0.9, but got 0.91');
		});

		it('[EH-15] should throw on timeoutMs below minimum', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 999);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('timeoutMs must be at least 1000, but got 999');
		});

		it('[EH-16] should throw on timeoutMs above maximum', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 600001);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('timeoutMs must be at most 600000, but got 600001');
		});

		it('[EH-17] should throw on negative attempt', () => {
			// ARRANGE
			const context = new ExecutionContext();

			// ACT & ASSERT
			expect(() => context.calculateDelay(-1)).toThrow('Execution attempt must be non-negative, but got -1');
		});

		it('[EH-18] should throw on attempt >= maxAttempts', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 10000);

			// ACT & ASSERT
			expect(() => context.calculateDelay(5)).toThrow('Execution attempt must be less than 5, but got 5');
		});

		it('[EH-19] should throw on already aborted parent signal', () => {
			// ARRANGE
			const context = new ExecutionContext();
			const parentController = new AbortController();
			parentController.abort();

			// ACT & ASSERT
			expect(() => context.createAbortSignal(parentController.signal)).toThrow();
		});
	});
});
