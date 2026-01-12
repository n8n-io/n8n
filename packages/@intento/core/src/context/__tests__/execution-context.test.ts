import { ExecutionContext, CONTEXT_EXECUTION } from '../execution-context';

/**
 * Tests for ExecutionContext
 * @author Claude Sonnet 4.5
 * @date 2026-01-11
 */

type OptionWithDefault = { name: string; default?: unknown };
type OptionWithTypeOptions = {
	name: string;
	typeOptions?: { minValue?: number; maxValue?: number };
};

function getOptionsFromCollection<T>(collection: unknown): T[] | undefined {
	return (collection as { options?: T[] }).options;
}

describe('CONTEXT_EXECUTION', () => {
	describe('business logic', () => {
		it('[BL-01] should export valid n8n node properties array', () => {
			// ASSERT
			expect(CONTEXT_EXECUTION).toBeInstanceOf(Array);
			expect(CONTEXT_EXECUTION).toHaveLength(1);
			expect(CONTEXT_EXECUTION[0].type).toBe('collection');
			expect(CONTEXT_EXECUTION[0].name).toBe('execution_context');
		});

		it('[BL-02] should have correct default values', () => {
			// ASSERT
			const options = getOptionsFromCollection<OptionWithDefault>(CONTEXT_EXECUTION[0]);
			expect(options).toBeDefined();
			expect(options).toHaveLength(4);

			const maxAttemptsOption = options?.find((opt) => opt.name === 'max_attempts');
			const maxDelayOption = options?.find((opt) => opt.name === 'max_delay_ms');
			const maxJitterOption = options?.find((opt) => opt.name === 'max_jitter');
			const timeoutOption = options?.find((opt) => opt.name === 'timeout_ms');

			expect(maxAttemptsOption?.default).toBe(5);
			expect(maxDelayOption?.default).toBe(5000);
			expect(maxJitterOption?.default).toBe(0.2);
			expect(timeoutOption?.default).toBe(10000);
		});

		it('[BL-03] should have boundary constraints in typeOptions', () => {
			// ASSERT
			const options = getOptionsFromCollection<OptionWithTypeOptions>(CONTEXT_EXECUTION[0]);
			expect(options).toBeDefined();
			expect(options).toHaveLength(4);
		});

		it('[BL-04] should have correct maxAttempts boundaries', () => {
			// ASSERT
			const options = getOptionsFromCollection<OptionWithTypeOptions>(CONTEXT_EXECUTION[0]);
			const maxAttemptsOption = options?.find((opt) => opt.name === 'max_attempts');

			expect(maxAttemptsOption?.typeOptions?.minValue).toBe(1);
			expect(maxAttemptsOption?.typeOptions?.maxValue).toBe(50);
		});

		it('[BL-05] should have correct maxDelayMs boundaries', () => {
			// ASSERT
			const options = getOptionsFromCollection<OptionWithTypeOptions>(CONTEXT_EXECUTION[0]);
			const maxDelayOption = options?.find((opt) => opt.name === 'max_delay_ms');

			expect(maxDelayOption?.typeOptions?.minValue).toBe(100);
			expect(maxDelayOption?.typeOptions?.maxValue).toBe(60000);
		});

		it('[BL-06] should have correct maxJitter boundaries', () => {
			// ASSERT
			const options = getOptionsFromCollection<OptionWithTypeOptions>(CONTEXT_EXECUTION[0]);
			const maxJitterOption = options?.find((opt) => opt.name === 'max_jitter');

			expect(maxJitterOption?.typeOptions?.minValue).toBe(0.1);
			expect(maxJitterOption?.typeOptions?.maxValue).toBe(0.9);
		});

		it('[BL-07] should have correct timeoutMs boundaries', () => {
			// ASSERT
			const options = getOptionsFromCollection<OptionWithTypeOptions>(CONTEXT_EXECUTION[0]);
			const timeoutOption = options?.find((opt) => opt.name === 'timeout_ms');

			expect(timeoutOption?.typeOptions?.minValue).toBe(1000);
			expect(timeoutOption?.typeOptions?.maxValue).toBe(600000);
		});
	});
});

describe('ExecutionContext', () => {
	let originalRandom: () => number;

	beforeEach(() => {
		originalRandom = Math.random;
		// Mock Math.random for deterministic tests
		Math.random = jest.fn(() => 0.5);
	});

	afterEach(() => {
		Math.random = originalRandom;
	});

	describe('business logic', () => {
		it('[BL-08] should create context with all valid parameters', () => {
			// ACT
			const context = new ExecutionContext(3, 2000, 0.3, 5000);

			// ASSERT
			expect(context.maxAttempts).toBe(3);
			expect(context.maxDelayMs).toBe(2000);
			expect(context.maxJitter).toBe(0.3);
			expect(context.timeoutMs).toBe(5000);
		});

		it('[BL-09] should create context with default parameters', () => {
			// ACT
			const context = new ExecutionContext();

			// ASSERT
			expect(context.maxAttempts).toBe(5);
			expect(context.maxDelayMs).toBe(5000);
			expect(context.maxJitter).toBe(0.2);
			expect(context.timeoutMs).toBe(10000);
		});

		it('[BL-10] should freeze instance after construction', () => {
			// ACT
			const context = new ExecutionContext(3, 2000, 0.3, 5000);

			// ASSERT
			expect(Object.isFrozen(context)).toBe(true);
			expect(() => {
				(context as { -readonly [K in keyof ExecutionContext]: ExecutionContext[K] }).maxAttempts = 10;
			}).toThrow();
		});

		it('[BL-11] should return log metadata with all properties', () => {
			// ARRANGE
			const context = new ExecutionContext(3, 2000, 0.3, 5000);

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				maxAttempts: 3,
				maxDelayMs: 2000,
				maxJitter: 0.3,
				timeoutMs: 5000,
			});
		});

		it('[BL-12] should calculate exponential backoff correctly', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0, 10000); // 0 jitter for pure exponential

			// ACT
			const delay0 = context.calculateDelay(0);
			const delay1 = context.calculateDelay(1);
			const delay2 = context.calculateDelay(2);
			const delay3 = context.calculateDelay(3);

			// ASSERT
			expect(delay0).toBe(0);
			// baseDelay = 5000 / 2^(5-1) = 5000 / 16 = 312.5
			expect(delay1).toBe(625); // 312.5 * 2^1 = 625
			expect(delay2).toBe(1250); // 312.5 * 2^2 = 1250
			expect(delay3).toBe(2500); // 312.5 * 2^3 = 2500
		});

		it('[BL-13] should apply jitter to delay calculation', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 10000);
			Math.random = jest.fn(() => 0.7); // Jitter will add variance

			// ACT
			const delay1 = context.calculateDelay(1);

			// ASSERT
			// baseDelay = 312.5
			// jitter = 0.2 * (0.7 - 0.5) * 2 * 312.5 = 0.2 * 0.2 * 625 = 25
			// delay = 312.5 * 2 + 25 = 625 + 25 = 650
			expect(delay1).toBe(650);
		});

		it('[BL-14] should clamp delay to maxDelayMs', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 1000, 0, 10000); // maxDelayMs = 1000

			// ACT
			const delay4 = context.calculateDelay(4);

			// ASSERT
			// baseDelay = 1000 / 16 = 62.5
			// theoretical delay = 62.5 * 2^4 = 62.5 * 16 = 1000
			// clamped to maxDelayMs
			expect(delay4).toBe(1000);
		});

		it('[BL-15] should create timeout abort signal without parent', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 10000);

			// ACT
			const signal = context.createAbortSignal();

			// ASSERT
			expect(signal).toBeInstanceOf(AbortSignal);
			expect(signal.aborted).toBe(false);
		});

		it('[BL-16] should combine parent and timeout signals', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 10000);
			const parentController = new AbortController();
			const parentSignal = parentController.signal;

			// ACT
			const combinedSignal = context.createAbortSignal(parentSignal);

			// ASSERT
			expect(combinedSignal).toBeInstanceOf(AbortSignal);
			expect(combinedSignal.aborted).toBe(false);

			// Abort parent - combined should also abort
			parentController.abort();
			expect(combinedSignal.aborted).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should return zero delay for attempt 0', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 10000);

			// ACT
			const delay = context.calculateDelay(0);

			// ASSERT
			expect(delay).toBe(0);
		});

		it('[EC-02] should handle maxAttempts at minimum boundary (1)', () => {
			// ACT
			const context = new ExecutionContext(1, 5000, 0.2, 10000);
			context.throwIfInvalid();

			// ASSERT
			expect(context.maxAttempts).toBe(1);
		});

		it('[EC-03] should handle maxAttempts at maximum boundary (50)', () => {
			// ACT
			const context = new ExecutionContext(50, 5000, 0.2, 10000);
			context.throwIfInvalid();

			// ASSERT
			expect(context.maxAttempts).toBe(50);
		});

		it('[EC-04] should handle maxDelayMs at minimum boundary (100)', () => {
			// ACT
			const context = new ExecutionContext(5, 100, 0.2, 10000);
			context.throwIfInvalid();

			// ASSERT
			expect(context.maxDelayMs).toBe(100);
		});

		it('[EC-05] should handle maxDelayMs at maximum boundary (60000)', () => {
			// ACT
			const context = new ExecutionContext(5, 60000, 0.2, 10000);
			context.throwIfInvalid();

			// ASSERT
			expect(context.maxDelayMs).toBe(60000);
		});

		it('[EC-06] should handle maxJitter at minimum boundary (0.1)', () => {
			// ACT
			const context = new ExecutionContext(5, 5000, 0.1, 10000);
			context.throwIfInvalid();

			// ASSERT
			expect(context.maxJitter).toBe(0.1);
		});

		it('[EC-07] should handle maxJitter at maximum boundary (0.9)', () => {
			// ACT
			const context = new ExecutionContext(5, 5000, 0.9, 10000);
			context.throwIfInvalid();

			// ASSERT
			expect(context.maxJitter).toBe(0.9);
		});

		it('[EC-08] should handle timeoutMs at minimum boundary (1000)', () => {
			// ACT
			const context = new ExecutionContext(5, 5000, 0.2, 1000);
			context.throwIfInvalid();

			// ASSERT
			expect(context.timeoutMs).toBe(1000);
		});

		it('[EC-09] should handle timeoutMs at maximum boundary (600000)', () => {
			// ACT
			const context = new ExecutionContext(5, 5000, 0.2, 600000);
			context.throwIfInvalid();

			// ASSERT
			expect(context.timeoutMs).toBe(600000);
		});

		it('[EC-10] should produce delays within expected range with jitter', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.5, 10000);
			Math.random = originalRandom; // Use real random

			// ACT - Run multiple times to test variance
			const delays: number[] = [];
			for (let i = 0; i < 100; i++) {
				delays.push(context.calculateDelay(1));
			}

			// ASSERT
			const avgDelay = delays.reduce((sum, d) => sum + d, 0) / delays.length;
			const minDelay = Math.min(...delays);
			const maxDelay = Math.max(...delays);

			// baseDelay = 5000 / 16 = 312.5
			// expected = 312.5 * 2 = 625
			// jitter range: ±50% of baseDelay = ±156.25
			// range: 625 - 156.25 to 625 + 156.25 = [468.75, 781.25]
			expect(avgDelay).toBeGreaterThan(550);
			expect(avgDelay).toBeLessThan(700);
			expect(minDelay).toBeGreaterThanOrEqual(468);
			expect(maxDelay).toBeLessThanOrEqual(782);
		});

		it('[EC-11] should calculate correct baseDelay for different maxAttempts', () => {
			// ARRANGE
			const context2 = new ExecutionContext(2, 1000, 0, 10000);
			const context5 = new ExecutionContext(5, 1000, 0, 10000);
			const context10 = new ExecutionContext(10, 1000, 0, 10000);

			// ACT
			const delay2 = context2.calculateDelay(1);
			const delay5 = context5.calculateDelay(1);
			const delay10 = context10.calculateDelay(1);

			// ASSERT
			// baseDelay scales: maxDelayMs / 2^(maxAttempts-1)
			// context2: 1000 / 2^1 = 500, delay1 = 500 * 2^1 = 1000
			// context5: 1000 / 2^4 = 62.5, delay1 = 62.5 * 2^1 = 125
			// context10: 1000 / 2^9 = 1.953, delay1 = 1.953 * 2^1 = 3.906
			expect(delay2).toBe(1000);
			expect(delay5).toBe(125);
			expect(delay10).toBeCloseTo(3.906, 2);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw Error if maxAttempts is null', () => {
			// ACT & ASSERT
			const context = new ExecutionContext(null as unknown as number, 5000, 0.2, 10000);
			expect(() => context.throwIfInvalid()).toThrow('maxAttempts is required for ExecutionContext');
		});

		it('[EH-02] should use default value when maxAttempts is undefined', () => {
			// ACT
			const context = new ExecutionContext(undefined, 5000, 0.2, 10000);

			// ASSERT - undefined triggers default parameter value
			expect(context.maxAttempts).toBe(5);
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[EH-03] should throw Error if maxDelayMs is null', () => {
			// ACT & ASSERT
			const context = new ExecutionContext(5, null as unknown as number, 0.2, 10000);
			expect(() => context.throwIfInvalid()).toThrow('maxDelayMs is required for ExecutionContext');
		});

		it('[EH-04] should use default value when maxDelayMs is undefined', () => {
			// ACT
			const context = new ExecutionContext(5, undefined, 0.2, 10000);

			// ASSERT - undefined triggers default parameter value
			expect(context.maxDelayMs).toBe(5000);
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[EH-05] should throw Error if maxJitter is null', () => {
			// ACT & ASSERT
			const context = new ExecutionContext(5, 5000, null as unknown as number, 10000);
			expect(() => context.throwIfInvalid()).toThrow('maxJitter is required for ExecutionContext');
		});

		it('[EH-06] should use default value when maxJitter is undefined', () => {
			// ACT
			const context = new ExecutionContext(5, 5000, undefined, 10000);

			// ASSERT - undefined triggers default parameter value
			expect(context.maxJitter).toBe(0.2);
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[EH-07] should throw Error if timeoutMs is null', () => {
			// ACT & ASSERT
			const context = new ExecutionContext(5, 5000, 0.2, null as unknown as number);
			expect(() => context.throwIfInvalid()).toThrow('timeoutMs is required for ExecutionContext');
		});

		it('[EH-08] should use default value when timeoutMs is undefined', () => {
			// ACT
			const context = new ExecutionContext(5, 5000, 0.2, undefined);

			// ASSERT - undefined triggers default parameter value
			expect(context.timeoutMs).toBe(10000);
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[EH-09] should throw RangeError if maxAttempts < 1', () => {
			// ACT & ASSERT
			const context = new ExecutionContext(0, 5000, 0.2, 10000);
			expect(() => context.throwIfInvalid()).toThrow(RangeError);
			expect(() => context.throwIfInvalid()).toThrow('maxAttempts must be at least 1');
		});

		it('[EH-10] should throw RangeError if maxAttempts > 50', () => {
			// ACT & ASSERT
			const context = new ExecutionContext(51, 5000, 0.2, 10000);
			expect(() => context.throwIfInvalid()).toThrow(RangeError);
			expect(() => context.throwIfInvalid()).toThrow('maxAttempts must be at most 50');
		});

		it('[EH-11] should throw RangeError if maxDelayMs < 100', () => {
			// ACT & ASSERT
			const context = new ExecutionContext(5, 99, 0.2, 10000);
			expect(() => context.throwIfInvalid()).toThrow(RangeError);
			expect(() => context.throwIfInvalid()).toThrow('maxDelayMs must be at least 100');
		});

		it('[EH-12] should throw RangeError if maxDelayMs > 60000', () => {
			// ACT & ASSERT
			const context = new ExecutionContext(5, 60001, 0.2, 10000);
			expect(() => context.throwIfInvalid()).toThrow(RangeError);
			expect(() => context.throwIfInvalid()).toThrow('maxDelayMs must be at most 60000');
		});

		it('[EH-13] should throw RangeError if maxJitter < 0.1', () => {
			// ACT & ASSERT
			const context = new ExecutionContext(5, 5000, 0.09, 10000);
			expect(() => context.throwIfInvalid()).toThrow(RangeError);
			expect(() => context.throwIfInvalid()).toThrow('maxJitter must be at least 0.1');
		});

		it('[EH-14] should throw RangeError if maxJitter > 0.9', () => {
			// ACT & ASSERT
			const context = new ExecutionContext(5, 5000, 0.91, 10000);
			expect(() => context.throwIfInvalid()).toThrow(RangeError);
			expect(() => context.throwIfInvalid()).toThrow('maxJitter must be at most 0.9');
		});

		it('[EH-15] should throw RangeError if timeoutMs < 1000', () => {
			// ACT & ASSERT
			const context = new ExecutionContext(5, 5000, 0.2, 999);
			expect(() => context.throwIfInvalid()).toThrow(RangeError);
			expect(() => context.throwIfInvalid()).toThrow('timeoutMs must be at least 1000');
		});

		it('[EH-16] should throw RangeError if timeoutMs > 600000', () => {
			// ACT & ASSERT
			const context = new ExecutionContext(5, 5000, 0.2, 600001);
			expect(() => context.throwIfInvalid()).toThrow(RangeError);
			expect(() => context.throwIfInvalid()).toThrow('timeoutMs must be at most 600000');
		});

		it('[EH-17] should throw RangeError if attempt < 0', () => {
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

		it('[EH-19] should prevent mutation after freeze', () => {
			// ARRANGE
			const context = new ExecutionContext(5, 5000, 0.2, 10000);
			type Mutable = { -readonly [K in keyof ExecutionContext]: ExecutionContext[K] } & { newProperty?: string };

			// ACT & ASSERT
			expect(() => {
				(context as Mutable).maxAttempts = 10;
			}).toThrow(TypeError);
			expect(() => {
				(context as Mutable).maxDelayMs = 10000;
			}).toThrow(TypeError);
			expect(() => {
				(context as Mutable).newProperty = 'test';
			}).toThrow(TypeError);
		});
	});
});
