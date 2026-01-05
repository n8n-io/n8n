import 'reflect-metadata';

import type { DelayMode } from '../delay-context';
import { DelayContext, CONTEXT_DELAY } from '../delay-context';

/**
 * Tests for DelayContext
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

describe('DelayContext', () => {
	describe('business logic', () => {
		it('[BL-01] should create context with noDelay mode', () => {
			// ARRANGE & ACT
			const context = new DelayContext('noDelay');

			// ASSERT
			expect(context.delayMode).toBe('noDelay');
			expect(context.delayValue).toBeUndefined();
		});

		it('[BL-02] should create context with fixedDelay mode', () => {
			// ARRANGE & ACT
			const context = new DelayContext('fixedDelay', 5000);

			// ASSERT
			expect(context.delayMode).toBe('fixedDelay');
			expect(context.delayValue).toBe(5000);
		});

		it('[BL-03] should create context with randomDelay mode', () => {
			// ARRANGE & ACT
			const context = new DelayContext('randomDelay', 3000);

			// ASSERT
			expect(context.delayMode).toBe('randomDelay');
			expect(context.delayValue).toBe(3000);
		});

		it('[BL-04] should freeze instance after construction', () => {
			// ARRANGE & ACT
			const context = new DelayContext('fixedDelay', 1000);

			// ASSERT
			expect(Object.isFrozen(context)).toBe(true);

			// Verify property modification fails
			expect(() => {
				(context as { delayMode: string }).delayMode = 'noDelay';
			}).toThrow();
		});

		it('[BL-05] should calculate delay of 0ms for noDelay mode', () => {
			// ARRANGE
			const context = new DelayContext('noDelay');

			// ACT
			const delay = context.calculateDelay();

			// ASSERT
			expect(delay).toBe(0);
		});

		it('[BL-06] should calculate exact delay for fixedDelay mode', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', 2500);

			// ACT
			const delay = context.calculateDelay();

			// ASSERT
			expect(delay).toBe(2500);
		});

		it('[BL-07] should calculate random delay between 0 and delayValue for randomDelay mode', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', 5000);

			// ACT - Test multiple times to verify randomness
			const delays = Array.from({ length: 50 }, () => context.calculateDelay());

			// ASSERT
			delays.forEach((delay) => {
				expect(delay).toBeGreaterThanOrEqual(0);
				expect(delay).toBeLessThan(5000);
			});

			// Verify we get different values (not all the same)
			const uniqueDelays = new Set(delays);
			expect(uniqueDelays.size).toBeGreaterThan(1);
		});

		it('[BL-08] should validate successfully for noDelay mode without delayValue', () => {
			// ARRANGE
			const context = new DelayContext('noDelay');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[BL-09] should validate successfully for fixedDelay with valid delayValue', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', 1000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[BL-10] should validate successfully for randomDelay with valid delayValue', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', 30000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[BL-11] should return correct log metadata', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', 2000);

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				delayMode: 'fixedDelay',
				delayValue: 2000,
			});
		});

		it('[BL-12] should return log metadata with undefined delayValue for noDelay', () => {
			// ARRANGE
			const context = new DelayContext('noDelay');

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				delayMode: 'noDelay',
				delayValue: undefined,
			});
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle minimum valid delayValue (100ms)', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', 100);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.calculateDelay()).toBe(100);
		});

		it('[EC-02] should return 0 for invalid delayMode in calculateDelay (defensive code)', () => {
			// ARRANGE
			const context = new DelayContext('invalidMode' as DelayMode, 1000);

			// ACT
			const delay = context.calculateDelay();

			// ASSERT
			expect(delay).toBe(0);
		});

		it('[EC-03] should handle maximum valid delayValue (60000ms)', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', 60000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.calculateDelay()).toBe(60000);
		});

		it('[EC-04] should handle randomDelay with minimum value', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', 100);

			// ACT
			const delays = Array.from({ length: 20 }, () => context.calculateDelay());

			// ASSERT
			delays.forEach((delay) => {
				expect(delay).toBeGreaterThanOrEqual(0);
				expect(delay).toBeLessThan(100);
			});
		});

		it('[EC-05] should handle randomDelay with maximum value', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', 60000);

			// ACT
			const delays = Array.from({ length: 20 }, () => context.calculateDelay());

			// ASSERT
			delays.forEach((delay) => {
				expect(delay).toBeGreaterThanOrEqual(0);
				expect(delay).toBeLessThan(60000);
			});
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw when fixedDelay mode has no delayValue', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', undefined);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('delayValue is required for the delayMode fixedDelay');
		});

		it('[EH-02] should throw when randomDelay mode has no delayValue', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', undefined);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('delayValue is required for the delayMode randomDelay');
		});

		it('[EH-03] should throw when delayValue is below minimum (100ms)', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', 99);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('delayValue must be at least 100');
		});

		it('[EH-04] should throw when delayValue is above maximum (60000ms)', () => {
			// ARRANGE
			const context = new DelayContext('randomDelay', 60001);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('delayValue must be at most 60000');
		});

		it('[EH-05] should throw when delayMode is invalid', () => {
			// ARRANGE
			const context = new DelayContext('invalidMode' as 'noDelay', 1000);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('delayMode must be one of: noDelay, randomDelay, fixedDelay');
		});

		it('[EH-06] should throw when delayValue is 0 (treated as missing)', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', 0);

			// ACT & ASSERT
			// Note: 0 is falsy, so !this.delayValue check catches it first
			expect(() => context.throwIfInvalid()).toThrow('delayValue is required for the delayMode fixedDelay');
		});

		it('[EH-07] should throw when delayValue is negative', () => {
			// ARRANGE
			const context = new DelayContext('fixedDelay', -500);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('delayValue must be at least 100');
		});
	});

	describe('CONTEXT_DELAY node properties', () => {
		it('[NP-01] should export delay mode property with correct configuration', () => {
			// ARRANGE
			const delayModeProperty = CONTEXT_DELAY[0];

			// ASSERT
			expect(delayModeProperty).toBeDefined();
			expect(delayModeProperty.displayName).toBe('Delay Mode');
			expect(delayModeProperty.name).toBe('delay_context_delay_mode');
			expect(delayModeProperty.type).toBe('options');
			expect(delayModeProperty.default).toBe('noDelay');
		});

		it('[NP-02] should have three delay mode options', () => {
			// ARRANGE
			const delayModeProperty = CONTEXT_DELAY[0] as { options: unknown[] };

			// ASSERT
			expect(delayModeProperty.options).toHaveLength(3);
		});

		it('[NP-03] should have noDelay option configured correctly', () => {
			// ARRANGE
			const delayModeProperty = CONTEXT_DELAY[0] as {
				options: Array<{ name: string; value: string; description: string }>;
			};
			const noDelayOption = delayModeProperty.options[0];

			// ASSERT
			expect(noDelayOption).toEqual({
				name: 'No Delay',
				value: 'noDelay',
				description: 'Execute requests immediately without delay',
			});
		});

		it('[NP-04] should have randomDelay option configured correctly', () => {
			// ARRANGE
			const delayModeProperty = CONTEXT_DELAY[0] as {
				options: Array<{ name: string; value: string; description: string }>;
			};
			const randomDelayOption = delayModeProperty.options[1];

			// ASSERT
			expect(randomDelayOption.name).toBe('Random Delay');
			expect(randomDelayOption.value).toBe('randomDelay');
			expect(randomDelayOption.description).toContain('random delay between');
		});

		it('[NP-05] should have fixedDelay option configured correctly', () => {
			// ARRANGE
			const delayModeProperty = CONTEXT_DELAY[0] as {
				options: Array<{ name: string; value: string; description: string }>;
			};
			const fixedDelayOption = delayModeProperty.options[2];

			// ASSERT
			expect(fixedDelayOption).toEqual({
				name: 'Fixed Delay',
				value: 'fixedDelay',
				description: 'Apply a fixed delay of the specified duration',
			});
		});

		it('[NP-06] should export delay value property with correct configuration', () => {
			// ARRANGE
			const delayValueProperty = CONTEXT_DELAY[1] as {
				displayName: string;
				name: string;
				type: string;
				default: number;
				typeOptions: { minValue: number; maxValue: number };
			};

			// ASSERT
			expect(delayValueProperty.displayName).toBe('Delay (ms)');
			expect(delayValueProperty.name).toBe('delay_context_delay_value');
			expect(delayValueProperty.type).toBe('number');
			expect(delayValueProperty.default).toBe(1000);
			expect(delayValueProperty.typeOptions.minValue).toBe(100);
			expect(delayValueProperty.typeOptions.maxValue).toBe(60000);
		});

		it('[NP-07] should only show delay value when randomDelay or fixedDelay selected', () => {
			// ARRANGE
			const delayValueProperty = CONTEXT_DELAY[1];

			// ASSERT
			expect(delayValueProperty.displayOptions?.show?.delay_context_delay_mode).toEqual(['randomDelay', 'fixedDelay']);
		});
		it('[NP-08] should export exactly two properties', () => {
			// ASSERT
			expect(CONTEXT_DELAY).toHaveLength(2);
		});
	});
});
