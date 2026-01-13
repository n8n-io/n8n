import 'reflect-metadata';

import { DelayContext } from '../delay-context';
import type { DelayMode } from '../delay-context';

/**
 * Tests for DelayContext
 * @author Claude Sonnet 4.5
 * @date 2026-01-13
 */

describe('DelayContext', () => {
	let mockMathRandom: jest.SpyInstance;

	beforeEach(() => {
		// Mock @mapTo decorator metadata
		jest.spyOn(Reflect, 'getMetadata').mockImplementation((key, _target, propertyKey) => {
			if (key === 'design:paramtypes') return [String, Number];
			if (key === 'custom:mapTo' && propertyKey === undefined) {
				return ['delay_context_delay_mode', 'delay_context_delay_value'];
			}
			return undefined;
		});

		mockMathRandom = jest.spyOn(Math, 'random');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('business logic', () => {
		it('[BL-01] should construct with noDelay mode and no value', () => {
			// ARRANGE & ACT
			const context = new DelayContext('noDelay', undefined);

			// ASSERT
			expect(context.delayMode).toBe('noDelay');
			expect(context.delayValue).toBeUndefined();
		});

		it('[BL-02] should construct with fixedDelay mode and value', () => {
			// ARRANGE & ACT
			const context = new DelayContext('fixedDelay', 1000);

			// ASSERT
			expect(context.delayMode).toBe('fixedDelay');
			expect(context.delayValue).toBe(1000);
		});

		it('[BL-03] should construct with randomDelay mode and value', () => {
			// ARRANGE & ACT
			const context = new DelayContext('randomDelay', 2000);

			// ASSERT
			expect(context.delayMode).toBe('randomDelay');
			expect(context.delayValue).toBe(2000);
		});

		it('[BL-04] should be immutable after construction', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', 1000);

			// ACT & ASSERT
			expect(() => {
				(context as { delayMode: DelayMode }).delayMode = 'noDelay';
			}).toThrow();
			expect(() => {
				(context as { delayValue: number }).delayValue = 5000;
			}).toThrow();
		});

		it('[BL-05] should return correct log metadata', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', 1500);

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				delayMode: 'fixedDelay',
				delayValue: 1500,
			});
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle delayValue at minimum boundary (100)', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', 100);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[EC-02] should handle delayValue at maximum boundary (60000)', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', 60000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[EC-03] should calculate zero delay for noDelay mode', () => {
			// ARRANGE
			const context = new DelayContext('noDelay', undefined);

			// ACT
			const delay = context.calculateDelay();

			// ASSERT
			expect(delay).toBe(0);
		});

		it('[EC-04] should calculate exact delay for fixedDelay mode', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', 2500);

			// ACT
			const delay = context.calculateDelay();

			// ASSERT
			expect(delay).toBe(2500);
		});

		it('[EC-05] should calculate random delay within range [0, delayValue)', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', 3000);
			mockMathRandom.mockReturnValue(0.5);

			// ACT
			const delay = context.calculateDelay();

			// ASSERT
			expect(delay).toBe(1500); // floor(3000 * 0.5)
			expect(mockMathRandom).toHaveBeenCalled();
		});

		it('[EC-06] should return 0 for unknown delay mode', () => {
			// ARRANGE
			const context = new DelayContext('unknownMode' as DelayMode, 1000);

			// ACT
			const delay = context.calculateDelay();

			// ASSERT
			expect(delay).toBe(0);
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw Error if delayValue missing for randomDelay', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', undefined);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"delayValue" is required for the delayMode randomDelay');
		});

		it('[EH-02] should throw Error if delayValue missing for fixedDelay', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', undefined);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"delayValue" is required for the delayMode fixedDelay');
		});

		it('[EH-03] should throw RangeError if delayValue below minimum (100)', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', 99);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow(RangeError);
			expect(() => context.throwIfInvalid()).toThrow('"delayValue" must be at least 100');
		});

		it('[EH-04] should throw RangeError if delayValue above maximum (60000)', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', 60001);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow(RangeError);
			expect(() => context.throwIfInvalid()).toThrow('"delayValue" must be at most 60000');
		});

		it('[EH-05] should throw Error for invalid delayMode string', () => {
			// ARRANGE
			const context = new DelayContext('invalidMode' as DelayMode, 1000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('"delayMode" must be one of: noDelay, randomDelay, fixedDelay');
		});

		it('[EH-06] should not throw for noDelay mode without value', () => {
			// ARRANGE
			const context = new DelayContext('noDelay', undefined);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});
	});

	describe('metadata & data', () => {
		it('[MD-01] should include both mode and value in log metadata', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', 4000);

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toHaveProperty('delayMode', 'randomDelay');
			expect(metadata).toHaveProperty('delayValue', 4000);
		});

		it('[MD-02] should include undefined delayValue in metadata when not provided', () => {
			// ARRANGE
			const context = new DelayContext('noDelay', undefined);

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				delayMode: 'noDelay',
				delayValue: undefined,
			});
		});
	});

	describe('random delay calculation', () => {
		it('should return 0 when Math.random returns 0', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', 5000);
			mockMathRandom.mockReturnValue(0);

			// ACT
			const delay = context.calculateDelay();

			// ASSERT
			expect(delay).toBe(0);
		});

		it('should return floor(delayValue * 0.999) when Math.random returns 0.999', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', 5000);
			mockMathRandom.mockReturnValue(0.999);

			// ACT
			const delay = context.calculateDelay();

			// ASSERT
			expect(delay).toBe(4995); // floor(5000 * 0.999)
			expect(delay).toBeLessThan(5000); // Verify it's less than delayValue
		});

		it('should always return integer values', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', 7777);
			mockMathRandom.mockReturnValue(0.333);

			// ACT
			const delay = context.calculateDelay();

			// ASSERT
			expect(Number.isInteger(delay)).toBe(true);
			expect(delay).toBe(2589); // floor(7777 * 0.333)
		});
	});
});
