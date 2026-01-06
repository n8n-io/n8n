import 'reflect-metadata';

import { CONTEXT_PARAMETER } from '../context-factory';
import { ExecutionContext } from '../execution-context';

/**
 * Tests for ExecutionContext
 * @author Claude Sonnet 4.5
 * @date 2026-01-06
 */

describe('ExecutionContext', () => {
	let mockRandom: jest.SpyInstance;

	beforeEach(() => {
		mockRandom = jest.spyOn(Math, 'random');
	});

	afterEach(() => {
		mockRandom.mockRestore();
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		describe('business logic', () => {
			it('[BL-01] should create context with all parameters', () => {
				// ARRANGE & ACT
				const context = new ExecutionContext(5, 5000, 0.2, 10000);

				// ASSERT
				expect(context.maxAttempts).toBe(5);
				expect(context.maxDelayMs).toBe(5000);
				expect(context.maxJitter).toBe(0.2);
				expect(context.timeoutMs).toBe(10000);
			});

			it('[BL-02] should apply default values when parameters omitted', () => {
				// ARRANGE & ACT
				const context = new ExecutionContext();

				// ASSERT
				expect(context.maxAttempts).toBe(5);
				expect(context.maxDelayMs).toBe(5000);
				expect(context.maxJitter).toBe(0.2);
				expect(context.timeoutMs).toBe(10000);
			});

			it('[BL-03] should freeze instance after construction', () => {
				// ARRANGE & ACT
				const context = new ExecutionContext();

				// ASSERT
				expect(Object.isFrozen(context)).toBe(true);
			});

			it('[BL-04] should apply @mapTo decorators to all parameters', () => {
				// ARRANGE & ACT
				const metadata = Reflect.getMetadata(CONTEXT_PARAMETER, ExecutionContext) as string[];

				// ASSERT
				expect(metadata).toBeDefined();
				expect(Array.isArray(metadata)).toBe(true);
				expect(metadata.length).toBe(4);
			});
		});

		describe('edge cases', () => {
			it('[EC-01] should handle boundary min values (1, 100, 0.1, 1000)', () => {
				// ARRANGE & ACT
				const context = new ExecutionContext(1, 100, 0.1, 1000);

				// ASSERT
				expect(context.maxAttempts).toBe(1);
				expect(context.maxDelayMs).toBe(100);
				expect(context.maxJitter).toBe(0.1);
				expect(context.timeoutMs).toBe(1000);
				expect(() => context.throwIfInvalid()).not.toThrow();
			});

			it('[EC-02] should handle boundary max values (50, 60000, 0.9, 600000)', () => {
				// ARRANGE & ACT
				const context = new ExecutionContext(50, 60000, 0.9, 600000);

				// ASSERT
				expect(context.maxAttempts).toBe(50);
				expect(context.maxDelayMs).toBe(60000);
				expect(context.maxJitter).toBe(0.9);
				expect(context.timeoutMs).toBe(600000);
				expect(() => context.throwIfInvalid()).not.toThrow();
			});
		});
	});

	describe('throwIfInvalid / validateRequired', () => {
		describe('business logic', () => {
			it('[BL-05] should pass validation with all valid parameters', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).not.toThrow();
			});
		});

		describe('error handling', () => {
			it('[EH-01] should throw Error if maxAttempts is null', () => {
				// ARRANGE
				const context = new ExecutionContext(null as unknown as number, 5000, 0.2, 10000);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).toThrow('maxAttempts is required for ExecutionContext');
			});

			it('[EH-03] should throw Error if maxDelayMs is null', () => {
				// ARRANGE
				const context = new ExecutionContext(5, null as unknown as number, 0.2, 10000);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).toThrow('maxDelayMs is required for ExecutionContext');
			});

			it('[EH-05] should throw Error if maxJitter is null', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, null as unknown as number, 10000);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).toThrow('maxJitter is required for ExecutionContext');
			});

			it('[EH-07] should throw Error if timeoutMs is null', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, null as unknown as number);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).toThrow('timeoutMs is required for ExecutionContext');
			});
		});
	});

	describe('validateBoundaries', () => {
		describe('error handling', () => {
			it('[EH-09] should throw RangeError if maxAttempts < 1', () => {
				// ARRANGE
				const context = new ExecutionContext(0, 5000, 0.2, 10000);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).toThrow(RangeError);
				expect(() => context.throwIfInvalid()).toThrow('maxAttempts must be at least 1');
			});

			it('[EH-10] should throw RangeError if maxAttempts > 50', () => {
				// ARRANGE
				const context = new ExecutionContext(51, 5000, 0.2, 10000);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).toThrow(RangeError);
				expect(() => context.throwIfInvalid()).toThrow('maxAttempts must be at most 50');
			});

			it('[EH-11] should throw RangeError if maxDelayMs < 100', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 99, 0.2, 10000);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).toThrow(RangeError);
				expect(() => context.throwIfInvalid()).toThrow('maxDelayMs must be at least 100');
			});

			it('[EH-12] should throw RangeError if maxDelayMs > 60000', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 60001, 0.2, 10000);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).toThrow(RangeError);
				expect(() => context.throwIfInvalid()).toThrow('maxDelayMs must be at most 60000');
			});

			it('[EH-13] should throw RangeError if maxJitter < 0.1', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.09, 10000);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).toThrow(RangeError);
				expect(() => context.throwIfInvalid()).toThrow('maxJitter must be at least 0.1');
			});

			it('[EH-14] should throw RangeError if maxJitter > 0.9', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.91, 10000);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).toThrow(RangeError);
				expect(() => context.throwIfInvalid()).toThrow('maxJitter must be at most 0.9');
			});

			it('[EH-15] should throw RangeError if timeoutMs < 1000', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 999);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).toThrow(RangeError);
				expect(() => context.throwIfInvalid()).toThrow('timeoutMs must be at least 1000');
			});

			it('[EH-16] should throw RangeError if timeoutMs > 600000', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 600001);

				// ACT & ASSERT
				expect(() => context.throwIfInvalid()).toThrow(RangeError);
				expect(() => context.throwIfInvalid()).toThrow('timeoutMs must be at most 600000');
			});
		});
	});

	describe('asLogMetadata', () => {
		describe('business logic', () => {
			it('[BL-06] should return all configuration as structured metadata', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);

				// ACT
				const metadata = context.asLogMetadata();

				// ASSERT
				expect(metadata).toEqual({
					maxAttempts: 5,
					maxDelayMs: 5000,
					maxJitter: 0.2,
					timeoutMs: 10000,
				});
			});
		});
	});

	describe('calculateDelay', () => {
		describe('business logic', () => {
			it('[BL-07] should return 0 for first attempt (attempt 0)', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);

				// ACT
				const delay = context.calculateDelay(0);

				// ASSERT
				expect(delay).toBe(0);
			});

			it('[BL-08] should calculate exponential backoff for subsequent attempts', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);
				mockRandom.mockReturnValue(0.5); // Neutral jitter (no effect)

				// ACT
				const delay1 = context.calculateDelay(1);
				const delay2 = context.calculateDelay(2);
				const delay3 = context.calculateDelay(3);

				// ASSERT
				// Base delay = 5000 / 2^(5-1) = 5000 / 16 = 312.5
				// Delay formula: baseDelay * 2^attempt
				// attempt 1: 312.5 * 2^1 = 625
				// attempt 2: 312.5 * 2^2 = 1250
				// attempt 3: 312.5 * 2^3 = 2500
				expect(delay1).toBeCloseTo(625, 0);
				expect(delay2).toBeCloseTo(1250, 0);
				expect(delay3).toBeCloseTo(2500, 0);
			});

			it('[BL-09] should apply jitter to delay calculation', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);
				mockRandom.mockReturnValue(0.8); // Positive jitter

				// ACT
				const delay = context.calculateDelay(1);

				// ASSERT
				// Base delay = 312.5
				// Base exponential = 312.5 * 2^1 = 625
				// Jitter = 0.2 * (0.8 - 0.5) * 2 * 312.5 = 0.2 * 0.3 * 2 * 312.5 = 37.5
				// Expected delay = 625 + 37.5 = 662.5
				expect(delay).toBeCloseTo(662.5, 0);
			});

			it('[BL-10] should cap delay at maxDelayMs', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);
				mockRandom.mockReturnValue(1); // Maximum positive jitter

				// ACT
				const delay = context.calculateDelay(4); // Last attempt

				// ASSERT
				// Even with maximum jitter, should not exceed maxDelayMs
				expect(delay).toBeLessThanOrEqual(5000);
			});
		});

		describe('edge cases', () => {
			it('[EC-03] should handle last attempt (maxAttempts - 1)', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);
				mockRandom.mockReturnValue(0.5); // Neutral jitter

				// ACT
				const delay = context.calculateDelay(4);

				// ASSERT
				// Base delay = 312.5, attempt 4: 312.5 * 2^4 = 5000
				expect(delay).toBeCloseTo(5000, 0);
			});

			it('[EC-04] should produce different delays with jitter', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);

				// ACT - First call with jitter
				mockRandom.mockReturnValueOnce(0.3);
				const delay1 = context.calculateDelay(1);

				// Second call with different jitter
				mockRandom.mockReturnValueOnce(0.7);
				const delay2 = context.calculateDelay(1);

				// ASSERT
				expect(delay1).not.toBe(delay2);
			});

			it('[EC-05] should scale base delay correctly for different maxAttempts', () => {
				// ARRANGE
				const context3 = new ExecutionContext(3, 5000, 0.2, 10000);
				const context10 = new ExecutionContext(10, 5000, 0.2, 10000);
				mockRandom.mockReturnValue(0.5); // Neutral jitter

				// ACT
				const delay3 = context3.calculateDelay(2); // Last attempt for 3
				const delay10 = context10.calculateDelay(9); // Last attempt for 10

				// ASSERT
				// Both should approach maxDelayMs at their final attempt
				expect(delay3).toBeCloseTo(5000, 0);
				expect(delay10).toBeCloseTo(5000, 0);
			});
		});

		describe('error handling', () => {
			it('[EH-17] should throw RangeError if attempt is negative', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);

				// ACT & ASSERT
				expect(() => context.calculateDelay(-1)).toThrow(RangeError);
				expect(() => context.calculateDelay(-1)).toThrow('Execution attempt must be non-negative');
			});

			it('[EH-18] should throw RangeError if attempt >= maxAttempts', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);

				// ACT & ASSERT
				expect(() => context.calculateDelay(5)).toThrow(RangeError);
				expect(() => context.calculateDelay(5)).toThrow('Execution attempt must be less than 5');
			});
		});
	});

	describe('createAbortSignal', () => {
		describe('business logic', () => {
			it('[BL-11] should create timeout signal without parent', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);

				// ACT
				const signal = context.createAbortSignal();

				// ASSERT
				expect(signal).toBeDefined();
				expect(signal).toBeInstanceOf(AbortSignal);
			});

			it('[BL-12] should combine parent and timeout signals', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);
				const parentController = new AbortController();
				const parentSignal = parentController.signal;

				// ACT
				const signal = context.createAbortSignal(parentSignal);

				// ASSERT
				expect(signal).toBeDefined();
				expect(signal).toBeInstanceOf(AbortSignal);
			});

			it('[BL-13] should call AbortSignal.timeout with timeoutMs', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);
				const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');

				// ACT
				context.createAbortSignal();

				// ASSERT
				expect(timeoutSpy).toHaveBeenCalledWith(10000);

				timeoutSpy.mockRestore();
			});

			it('[BL-14] should call AbortSignal.any with parent and timeout', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);
				const parentController = new AbortController();
				const parentSignal = parentController.signal;
				const anySpy = jest.spyOn(AbortSignal, 'any');

				// ACT
				context.createAbortSignal(parentSignal);

				// ASSERT
				expect(anySpy).toHaveBeenCalledWith(expect.arrayContaining([parentSignal, expect.any(AbortSignal)]));

				anySpy.mockRestore();
			});
		});

		describe('edge cases', () => {
			it('[EC-06] should check parent signal before creating timeout', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);
				const parentController = new AbortController();
				const parentSignal = parentController.signal;
				const throwIfAbortedSpy = jest.spyOn(parentSignal, 'throwIfAborted');

				// ACT
				context.createAbortSignal(parentSignal);

				// ASSERT
				expect(throwIfAbortedSpy).toHaveBeenCalled();

				throwIfAbortedSpy.mockRestore();
			});
		});

		describe('error handling', () => {
			it('[EH-19] should throw if parent signal already aborted', () => {
				// ARRANGE
				const context = new ExecutionContext(5, 5000, 0.2, 10000);
				const parentController = new AbortController();
				parentController.abort();
				const parentSignal = parentController.signal;

				// ACT & ASSERT
				expect(() => context.createAbortSignal(parentSignal)).toThrow();
			});
		});
	});
});
