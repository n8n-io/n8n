import { CONTEXT_SUPPRESSION, SUPPRESSION, SuppressionContext } from '../suppression-context';

/**
 * Tests for SuppressionContext
 * @author Claude Sonnet 4.5
 * @date 2026-01-12
 */

describe('suppression-context', () => {
	describe('SUPPRESSION constant', () => {
		it('[BL-01] should export KEYS with correct structure', () => {
			// ARRANGE & ACT
			const keys = SUPPRESSION.KEYS;

			// ASSERT
			expect(keys.ENABLED).toBe('suppression_context_enabled');
			expect(keys.LIST).toBe('suppression_context_list');
		});

		it('[BL-02] should export DEFAULTS with correct value', () => {
			// ARRANGE & ACT
			const defaults = SUPPRESSION.DEFAULTS;

			// ASSERT
			expect(defaults.ENABLED).toBe(false);
		});
	});

	describe('SuppressionContext', () => {
		describe('constructor', () => {
			it('[BL-03] should create context with default values', () => {
				// ARRANGE & ACT
				const context = new SuppressionContext();

				// ASSERT
				expect(context.enabled).toBe(SUPPRESSION.DEFAULTS.ENABLED);
				expect(context.list).toBeUndefined();
			});

			it('[BL-04] should create context with custom enabled=true and list', () => {
				// ARRANGE
				const enabled = true;
				const list = ['Dr', 'Prof', 'Inc'];

				// ACT
				const context = new SuppressionContext(enabled, list);

				// ASSERT
				expect(context.enabled).toBe(enabled);
				expect(context.list).toEqual(list);
			});

			it('[BL-05] should create context with enabled=false and no list', () => {
				// ARRANGE
				const enabled = false;

				// ACT
				const context = new SuppressionContext(enabled);

				// ASSERT
				expect(context.enabled).toBe(enabled);
				expect(context.list).toBeUndefined();
			});

			it('[BL-06] should set readonly properties correctly', () => {
				// ARRANGE
				const enabled = true;
				const list = ['Dr', 'Prof'];

				// ACT
				const context = new SuppressionContext(enabled, list);

				// ASSERT
				expect(context.enabled).toBe(enabled);
				expect(context.list).toEqual(list);
				// TypeScript readonly enforces at compile time, runtime check via freeze
			});

			it('[BL-07] should freeze context object', () => {
				// ARRANGE & ACT
				const context = new SuppressionContext(true, ['Dr']);

				// ASSERT
				expect(Object.isFrozen(context)).toBe(true);
			});
		});

		describe('throwIfInvalid', () => {
			describe('valid values', () => {
				it('[BL-10] should pass validation when disabled without list', () => {
					// ARRANGE
					const context = new SuppressionContext(false);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).not.toThrow();
				});

				it('[BL-11] should pass validation when enabled with list', () => {
					// ARRANGE
					const context = new SuppressionContext(true, ['Dr', 'Prof']);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).not.toThrow();
				});

				it('[EC-01] should handle enabled=true with empty list array', () => {
					// ARRANGE
					const context = new SuppressionContext(true, []);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).not.toThrow();
				});

				it('[EC-02] should handle undefined list when enabled=false', () => {
					// ARRANGE
					const context = new SuppressionContext(false, undefined);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).not.toThrow();
				});
			});

			describe('invalid values', () => {
				it('[EH-01] should throw when enabled=true but list is undefined', () => {
					// ARRANGE
					const context = new SuppressionContext(true, undefined);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).toThrow();
				});

				it('[EH-02] should throw with descriptive error message', () => {
					// ARRANGE
					const context = new SuppressionContext(true, undefined);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).toThrow('"list" must be provided when suppression is enabled.');
				});
			});
		});

		describe('asLogMetadata', () => {
			it('[BL-08] should return correct log metadata when enabled with list', () => {
				// ARRANGE
				const list = ['Dr', 'Prof', 'Inc'];
				const context = new SuppressionContext(true, list);

				// ACT
				const metadata = context.asLogMetadata();

				// ASSERT
				expect(metadata).toEqual({
					enabled: true,
					listLength: 3,
				});
			});

			it('[BL-09] should return correct log metadata when disabled', () => {
				// ARRANGE
				const context = new SuppressionContext(false);

				// ACT
				const metadata = context.asLogMetadata();

				// ASSERT
				expect(metadata).toEqual({
					enabled: false,
					listLength: 0,
				});
			});

			it('[EC-03] should return listLength 0 for undefined list', () => {
				// ARRANGE
				const context = new SuppressionContext(false, undefined);

				// ACT
				const metadata = context.asLogMetadata();

				// ASSERT
				expect(metadata.listLength).toBe(0);
			});

			it('[EC-05] should handle list with single item', () => {
				// ARRANGE
				const context = new SuppressionContext(true, ['Dr']);

				// ACT
				const metadata = context.asLogMetadata();

				// ASSERT
				expect(metadata).toEqual({
					enabled: true,
					listLength: 1,
				});
			});

			it('[EC-06] should handle list with multiple items', () => {
				// ARRANGE
				const list = ['Dr', 'Prof', 'Inc', 'Ltd', 'Fig'];
				const context = new SuppressionContext(true, list);

				// ACT
				const metadata = context.asLogMetadata();

				// ASSERT
				expect(metadata).toEqual({
					enabled: true,
					listLength: 5,
				});
			});
		});

		describe('immutability', () => {
			it('[EC-04] should create immutable object (prevent property mutation)', () => {
				// ARRANGE
				const context = new SuppressionContext(true, ['Dr', 'Prof']);

				// ACT & ASSERT
				expect(Object.isFrozen(context)).toBe(true);
				expect(() => {
					// @ts-expect-error - Testing runtime immutability
					context.enabled = false;
				}).toThrow();
			});
		});
	});

	describe('CONTEXT_SUPPRESSION constant', () => {
		it('[BL-12] should export valid INodeProperties array with 2 items', () => {
			// ARRANGE & ACT & ASSERT
			expect(CONTEXT_SUPPRESSION).toBeInstanceOf(Array);
			expect(CONTEXT_SUPPRESSION).toHaveLength(2);
		});

		it('[BL-13] should define Enable Custom Suppressions boolean field', () => {
			// ARRANGE & ACT
			const enableField = CONTEXT_SUPPRESSION[0];

			// ASSERT
			expect(enableField.displayName).toBe('Enable Custom Suppressions');
			expect(enableField.name).toBe(SUPPRESSION.KEYS.ENABLED);
			expect(enableField.type).toBe('boolean');
			expect(enableField.default).toBe(SUPPRESSION.DEFAULTS.ENABLED);
			expect(enableField.description).toContain('prevent sentence breaks');
		});

		it('[BL-14] should define Suppression Terms multi-value string field', () => {
			// ARRANGE & ACT
			const listField = CONTEXT_SUPPRESSION[1];

			// ASSERT
			expect(listField.displayName).toBe('Suppression Terms');
			expect(listField.name).toBe(SUPPRESSION.KEYS.LIST);
			expect(listField.type).toBe('string');
			expect(listField.typeOptions?.multipleValues).toBe(true);
			expect(listField.typeOptions?.multipleValueButtonText).toBe('Add Term');
			expect(listField.default).toEqual([]);
			expect(listField.placeholder).toBe('Dr');
			expect(listField.description).toContain('NOT trigger sentence breaks');
		});

		it('[BL-15] should use SUPPRESSION constants for all keys', () => {
			// ARRANGE & ACT
			const enableField = CONTEXT_SUPPRESSION[0];
			const listField = CONTEXT_SUPPRESSION[1];

			// ASSERT
			expect(enableField.name).toBe(SUPPRESSION.KEYS.ENABLED);
			expect(listField.name).toBe(SUPPRESSION.KEYS.LIST);
		});

		it('[BL-16] should use SUPPRESSION constants for defaults', () => {
			// ARRANGE & ACT
			const enableField = CONTEXT_SUPPRESSION[0];

			// ASSERT
			expect(enableField.default).toBe(SUPPRESSION.DEFAULTS.ENABLED);
		});

		it('[BL-17] should have conditional display for Suppression Terms', () => {
			// ARRANGE & ACT
			const listField = CONTEXT_SUPPRESSION[1];

			// ASSERT
			expect(listField.displayOptions).toBeDefined();
			expect(listField.displayOptions?.show).toBeDefined();
			expect(listField.displayOptions?.show?.[SUPPRESSION.KEYS.ENABLED]).toEqual([true]);
		});
	});
});
