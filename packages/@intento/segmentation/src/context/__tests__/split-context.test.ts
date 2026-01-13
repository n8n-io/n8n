import { CONTEXT_SPLIT, SPLIT, SplitContext } from '../split-context';

/**
 * Tests for SplitContext
 * @author Claude Sonnet 4.5
 * @date 2026-01-12
 */

describe('split-context', () => {
	describe('SPLIT constant', () => {
		it('[BL-01] should export KEYS with correct collection structure', () => {
			// ARRANGE & ACT
			const keys = SPLIT.KEYS;

			// ASSERT
			expect(keys.COLLECTION).toBe('split_context_collection');
			expect(keys.BATCH_SIZE).toBe('split_context_batch_size');
			expect(keys.SEGMENT_SIZE).toBe('split_context_segment_size');
		});

		it('[BL-02] should export BOUNDARIES with correct min/max values', () => {
			// ARRANGE & ACT
			const boundaries = SPLIT.BOUNDARIES;

			// ASSERT
			expect(boundaries.BATCH_SIZE).toEqual({ min: 1, max: 500 });
			expect(boundaries.SEGMENT_SIZE).toEqual({ min: 200, max: 5000 });
		});

		it('[BL-03] should export DEFAULTS matching valid ranges', () => {
			// ARRANGE & ACT
			const defaults = SPLIT.DEFAULTS;

			// ASSERT
			expect(defaults.BATCH_SIZE).toBe(50);
			expect(defaults.SEGMENT_SIZE).toBe(1000);
			// Verify defaults are within boundaries
			expect(defaults.BATCH_SIZE).toBeGreaterThanOrEqual(SPLIT.BOUNDARIES.BATCH_SIZE.min);
			expect(defaults.BATCH_SIZE).toBeLessThanOrEqual(SPLIT.BOUNDARIES.BATCH_SIZE.max);
			expect(defaults.SEGMENT_SIZE).toBeGreaterThanOrEqual(SPLIT.BOUNDARIES.SEGMENT_SIZE.min);
			expect(defaults.SEGMENT_SIZE).toBeLessThanOrEqual(SPLIT.BOUNDARIES.SEGMENT_SIZE.max);
		});
	});

	describe('SplitContext', () => {
		describe('constructor', () => {
			it('[BL-04] should create context with default values', () => {
				// ARRANGE & ACT
				const context = new SplitContext();

				// ASSERT
				expect(context.batchSize).toBe(SPLIT.DEFAULTS.BATCH_SIZE);
				expect(context.segmentSize).toBe(SPLIT.DEFAULTS.SEGMENT_SIZE);
			});

			it('[BL-05] should create context with custom valid values', () => {
				// ARRANGE
				const customBatchSize = 100;
				const customSegmentSize = 2000;

				// ACT
				const context = new SplitContext(customBatchSize, customSegmentSize);

				// ASSERT
				expect(context.batchSize).toBe(customBatchSize);
				expect(context.segmentSize).toBe(customSegmentSize);
			});

			it('[BL-06] should set readonly properties correctly', () => {
				// ARRANGE
				const batchSize = 75;
				const segmentSize = 1500;

				// ACT
				const context = new SplitContext(batchSize, segmentSize);

				// ASSERT
				expect(context.batchSize).toBe(batchSize);
				expect(context.segmentSize).toBe(segmentSize);
				// TypeScript readonly enforces at compile time, runtime check via freeze
			});

			it('[BL-07] should freeze context object', () => {
				// ARRANGE & ACT
				const context = new SplitContext(50, 1000);

				// ASSERT
				expect(Object.isFrozen(context)).toBe(true);
			});
		});

		describe('throwIfInvalid', () => {
			describe('valid values', () => {
				it('[BL-09] should pass validation with valid values', () => {
					// ARRANGE
					const context = new SplitContext(100, 2000);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).not.toThrow();
				});

				it('[EC-01] should accept batchSize at minimum boundary (1)', () => {
					// ARRANGE
					const context = new SplitContext(1, 1000);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).not.toThrow();
				});

				it('[EC-02] should accept batchSize at maximum boundary (500)', () => {
					// ARRANGE
					const context = new SplitContext(500, 1000);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).not.toThrow();
				});

				it('[EC-03] should accept segmentSize at minimum boundary (200)', () => {
					// ARRANGE
					const context = new SplitContext(50, 200);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).not.toThrow();
				});

				it('[EC-04] should accept segmentSize at maximum boundary (5000)', () => {
					// ARRANGE
					const context = new SplitContext(50, 5000);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).not.toThrow();
				});
			});

			describe('invalid values', () => {
				it('[EH-01] should throw when batchSize below minimum', () => {
					// ARRANGE
					const context = new SplitContext(0, 1000);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).toThrow();
				});

				it('[EH-02] should throw when batchSize above maximum', () => {
					// ARRANGE
					const context = new SplitContext(501, 1000);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).toThrow();
				});

				it('[EH-03] should throw when segmentSize below minimum', () => {
					// ARRANGE
					const context = new SplitContext(50, 199);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).toThrow();
				});

				it('[EH-04] should throw when segmentSize above maximum', () => {
					// ARRANGE
					const context = new SplitContext(50, 5001);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).toThrow();
				});

				it('[EH-05] should throw with descriptive message for batchSize min', () => {
					// ARRANGE
					const context = new SplitContext(0, 1000);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).toThrow('"batchSize" must be at least 1');
				});

				it('[EH-06] should throw with descriptive message for batchSize max', () => {
					// ARRANGE
					const context = new SplitContext(501, 1000);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).toThrow('"batchSize" must be at most 500');
				});

				it('[EH-07] should throw with descriptive message for segmentSize min', () => {
					// ARRANGE
					const context = new SplitContext(50, 199);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).toThrow('"segmentSize" must be at least 200');
				});

				it('[EH-08] should throw with descriptive message for segmentSize max', () => {
					// ARRANGE
					const context = new SplitContext(50, 5001);

					// ACT & ASSERT
					expect(() => context.throwIfInvalid()).toThrow('"segmentSize" must be at most 5000');
				});
			});
		});

		describe('asLogMetadata', () => {
			it('[BL-08] should return correct log metadata', () => {
				// ARRANGE
				const batchSize = 75;
				const segmentSize = 1500;
				const context = new SplitContext(batchSize, segmentSize);

				// ACT
				const metadata = context.asLogMetadata();

				// ASSERT
				expect(metadata).toEqual({
					batchSize,
					segmentSize,
				});
			});
		});

		describe('immutability', () => {
			it('[EC-05] should create immutable object (prevent property mutation)', () => {
				// ARRANGE
				const context = new SplitContext(100, 2000);

				// ACT & ASSERT
				expect(() => {
					(context as { batchSize: number }).batchSize = 200;
				}).toThrow();

				expect(() => {
					(context as { segmentSize: number }).segmentSize = 3000;
				}).toThrow();

				// Verify values unchanged
				expect(context.batchSize).toBe(100);
				expect(context.segmentSize).toBe(2000);
			});
		});
	});

	describe('CONTEXT_SPLIT constant', () => {
		it('[BL-10] should export valid INodeProperties array', () => {
			// ARRANGE & ACT
			const properties = CONTEXT_SPLIT;

			// ASSERT
			expect(Array.isArray(properties)).toBe(true);
			expect(properties).toHaveLength(1);
		});

		it('[BL-11] should define collection with correct structure', () => {
			// ARRANGE & ACT
			const collection = CONTEXT_SPLIT[0];

			// ASSERT
			expect(collection.displayName).toBe('Split Options');
			expect(collection.name).toBe(SPLIT.KEYS.COLLECTION);
			expect(collection.type).toBe('collection');
			expect(collection.placeholder).toBe('Add Split Option');
			expect(collection.default).toEqual({});
			expect(Array.isArray(collection.options)).toBe(true);
			expect(collection.options).toHaveLength(2);
		});

		it('[BL-12] should have batch size option with correct boundaries', () => {
			// ARRANGE & ACT
			const collection = CONTEXT_SPLIT[0];
			const batchSizeOption = collection.options?.find((opt) => 'name' in opt && opt.name === SPLIT.KEYS.BATCH_SIZE);

			// ASSERT
			expect(batchSizeOption).toBeDefined();
			if (batchSizeOption && 'typeOptions' in batchSizeOption) {
				expect(batchSizeOption.displayName).toBe('Batch Size');
				expect(batchSizeOption.type).toBe('number');
				expect(batchSizeOption.typeOptions?.minValue).toBe(SPLIT.BOUNDARIES.BATCH_SIZE.min);
				expect(batchSizeOption.typeOptions?.maxValue).toBe(SPLIT.BOUNDARIES.BATCH_SIZE.max);
				expect(batchSizeOption.default).toBe(SPLIT.DEFAULTS.BATCH_SIZE);
			}
		});

		it('[BL-13] should have segment size option with correct boundaries', () => {
			// ARRANGE & ACT
			const collection = CONTEXT_SPLIT[0];
			const segmentSizeOption = collection.options?.find((opt) => 'name' in opt && opt.name === SPLIT.KEYS.SEGMENT_SIZE);

			// ASSERT
			expect(segmentSizeOption).toBeDefined();
			if (segmentSizeOption && 'typeOptions' in segmentSizeOption) {
				expect(segmentSizeOption.displayName).toBe('Segment Size');
				expect(segmentSizeOption.type).toBe('number');
				expect(segmentSizeOption.typeOptions?.minValue).toBe(SPLIT.BOUNDARIES.SEGMENT_SIZE.min);
				expect(segmentSizeOption.typeOptions?.maxValue).toBe(SPLIT.BOUNDARIES.SEGMENT_SIZE.max);
				expect(segmentSizeOption.default).toBe(SPLIT.DEFAULTS.SEGMENT_SIZE);
			}
		});

		it('[BL-14] should use SPLIT constants for all keys', () => {
			// ARRANGE & ACT
			const collection = CONTEXT_SPLIT[0];
			const batchSizeOption = collection.options?.find((opt) => 'name' in opt && opt.name === SPLIT.KEYS.BATCH_SIZE);
			const segmentSizeOption = collection.options?.find((opt) => 'name' in opt && opt.name === SPLIT.KEYS.SEGMENT_SIZE);

			// ASSERT
			expect(collection.name).toBe(SPLIT.KEYS.COLLECTION);
			expect(batchSizeOption && 'name' in batchSizeOption && batchSizeOption.name).toBe(SPLIT.KEYS.BATCH_SIZE);
			expect(segmentSizeOption && 'name' in segmentSizeOption && segmentSizeOption.name).toBe(SPLIT.KEYS.SEGMENT_SIZE);
		});

		it('[BL-15] should use SPLIT constants for all boundaries', () => {
			// ARRANGE & ACT
			const collection = CONTEXT_SPLIT[0];
			const batchSizeOption = collection.options?.find((opt) => 'name' in opt && opt.name === SPLIT.KEYS.BATCH_SIZE);
			const segmentSizeOption = collection.options?.find((opt) => 'name' in opt && opt.name === SPLIT.KEYS.SEGMENT_SIZE);

			// ASSERT
			if (batchSizeOption && 'typeOptions' in batchSizeOption) {
				expect(batchSizeOption.typeOptions?.minValue).toBe(SPLIT.BOUNDARIES.BATCH_SIZE.min);
				expect(batchSizeOption.typeOptions?.maxValue).toBe(SPLIT.BOUNDARIES.BATCH_SIZE.max);
			}
			if (segmentSizeOption && 'typeOptions' in segmentSizeOption) {
				expect(segmentSizeOption.typeOptions?.minValue).toBe(SPLIT.BOUNDARIES.SEGMENT_SIZE.min);
				expect(segmentSizeOption.typeOptions?.maxValue).toBe(SPLIT.BOUNDARIES.SEGMENT_SIZE.max);
			}
		});

		it('[BL-16] should use SPLIT constants for all defaults', () => {
			// ARRANGE & ACT
			const collection = CONTEXT_SPLIT[0];
			const batchSizeOption = collection.options?.find((opt) => 'name' in opt && opt.name === SPLIT.KEYS.BATCH_SIZE);
			const segmentSizeOption = collection.options?.find((opt) => 'name' in opt && opt.name === SPLIT.KEYS.SEGMENT_SIZE);

			// ASSERT
			if (batchSizeOption && 'default' in batchSizeOption) {
				expect(batchSizeOption.default).toBe(SPLIT.DEFAULTS.BATCH_SIZE);
			}
			if (segmentSizeOption && 'default' in segmentSizeOption) {
				expect(segmentSizeOption.default).toBe(SPLIT.DEFAULTS.SEGMENT_SIZE);
			}
		});
	});
});
