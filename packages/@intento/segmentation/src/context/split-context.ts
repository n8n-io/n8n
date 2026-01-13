import { IContext, mapTo } from 'intento-core';
import { INodeProperties } from 'n8n-workflow';

/**
 * Configuration constants for text splitting operations.
 *
 * Single source of truth for keys, boundaries, and defaults to ensure
 * consistency between runtime validation and UI constraints.
 */
export const SPLIT = {
	KEYS: {
		COLLECTION: 'split_context_collection',
		BATCH_SIZE: 'split_context_batch_size',
		SEGMENT_SIZE: 'split_context_segment_size',
	},
	BOUNDARIES: {
		BATCH_SIZE: { min: 1, max: 500 },
		SEGMENT_SIZE: { min: 200, max: 5000 },
	},
	DEFAULTS: {
		BATCH_SIZE: 50,
		SEGMENT_SIZE: 1000,
	},
};

/**
 * Context for text segmentation operations with batch processing control.
 *
 * Immutable configuration object created from n8n node parameters via @mapTo decorators.
 * Call throwIfInvalid() after construction to validate parameter boundaries.
 *
 * @example
 * ```typescript
 * const context = new SplitContext(100, 2000);
 * context.throwIfInvalid(); // Throws if values out of bounds
 * ```
 */
export class SplitContext implements IContext {
	readonly batchSize: number;
	readonly segmentSize: number;

	/**
	 * Creates immutable split context from n8n node parameters.
	 *
	 * @param batchSize - Number of items to process per batch (1-500)
	 * @param segmentSize - Maximum characters per text segment (200-5000)
	 */
	constructor(
		@mapTo(SPLIT.KEYS.BATCH_SIZE, SPLIT.KEYS.COLLECTION) batchSize: number = SPLIT.DEFAULTS.BATCH_SIZE,
		@mapTo(SPLIT.KEYS.SEGMENT_SIZE, SPLIT.KEYS.COLLECTION) segmentSize: number = SPLIT.DEFAULTS.SEGMENT_SIZE,
	) {
		this.batchSize = batchSize;
		this.segmentSize = segmentSize;
		// NOTE: Freeze to ensure immutability and prevent accidental mutation after validation
		Object.freeze(this);
	}

	/**
	 * Validates parameter boundaries against defined constraints.
	 *
	 * Must be called after construction to verify values are within acceptable ranges.
	 * Throws Error with descriptive message if any parameter is out of bounds.
	 *
	 * @throws Error if batchSize not in [1, 500] or segmentSize not in [200, 5000]
	 */
	throwIfInvalid(): void {
		if (this.batchSize < SPLIT.BOUNDARIES.BATCH_SIZE.min)
			throw new Error(`"batchSize" must be at least ${SPLIT.BOUNDARIES.BATCH_SIZE.min}`);
		if (this.batchSize > SPLIT.BOUNDARIES.BATCH_SIZE.max) throw new Error(`"batchSize" must be at most ${SPLIT.BOUNDARIES.BATCH_SIZE.max}`);
		if (this.segmentSize < SPLIT.BOUNDARIES.SEGMENT_SIZE.min)
			throw new Error(`"segmentSize" must be at least ${SPLIT.BOUNDARIES.SEGMENT_SIZE.min}`);
		if (this.segmentSize > SPLIT.BOUNDARIES.SEGMENT_SIZE.max)
			throw new Error(`"segmentSize" must be at most ${SPLIT.BOUNDARIES.SEGMENT_SIZE.max}`);
	}

	/**
	 * Returns context values as structured metadata for logging.
	 *
	 * @returns Object with batchSize and segmentSize for log correlation
	 */
	asLogMetadata(): Record<string, unknown> {
		return {
			batchSize: this.batchSize,
			segmentSize: this.segmentSize,
		};
	}
}

/**
 * n8n node properties for split context configuration UI.
 *
 * Defines collection parameter with batch size and segment size options.
 * UI typeOptions boundaries must match SPLIT.BOUNDARIES for consistency.
 */
export const CONTEXT_SPLIT = [
	{
		displayName: 'Split Options',
		name: SPLIT.KEYS.COLLECTION,
		type: 'collection',
		placeholder: 'Add Split Option',
		default: {},
		options: [
			{
				displayName: 'Batch Size',
				name: SPLIT.KEYS.BATCH_SIZE,
				type: 'number',
				typeOptions: {
					minValue: SPLIT.BOUNDARIES.BATCH_SIZE.min,
					maxValue: SPLIT.BOUNDARIES.BATCH_SIZE.max,
				},
				default: SPLIT.DEFAULTS.BATCH_SIZE,
				description: 'Number of items to process in each batch.',
			},
			{
				displayName: 'Segment Size',
				name: SPLIT.KEYS.SEGMENT_SIZE,
				type: 'number',
				typeOptions: {
					minValue: SPLIT.BOUNDARIES.SEGMENT_SIZE.min,
					maxValue: SPLIT.BOUNDARIES.SEGMENT_SIZE.max,
				},
				default: SPLIT.DEFAULTS.SEGMENT_SIZE,
				description: 'Maximum number of characters per text segment.',
			},
		],
	},
] as INodeProperties[];
