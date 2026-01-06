import { IContext, mapTo } from 'intento-core';
import { INodeProperties } from 'n8n-workflow';

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

export class SplitContext implements IContext {
	readonly batchSize: number;
	readonly segmentSize: number;

	constructor(
		@mapTo(SPLIT.KEYS.BATCH_SIZE, SPLIT.KEYS.COLLECTION) batchSize: number = SPLIT.DEFAULTS.BATCH_SIZE,
		@mapTo(SPLIT.KEYS.SEGMENT_SIZE, SPLIT.KEYS.COLLECTION) segmentSize: number = SPLIT.DEFAULTS.SEGMENT_SIZE,
	) {
		this.batchSize = batchSize;
		this.segmentSize = segmentSize;
		Object.freeze(this);
	}

	throwIfInvalid(): void {
		if (this.batchSize < SPLIT.BOUNDARIES.BATCH_SIZE.min) throw new Error(`batchSize must be at least ${SPLIT.BOUNDARIES.BATCH_SIZE.min}`);
		if (this.batchSize > SPLIT.BOUNDARIES.BATCH_SIZE.max) throw new Error(`batchSize must be at most ${SPLIT.BOUNDARIES.BATCH_SIZE.max}`);
		if (this.segmentSize < SPLIT.BOUNDARIES.SEGMENT_SIZE.min)
			throw new Error(`segmentSize must be at least ${SPLIT.BOUNDARIES.SEGMENT_SIZE.min}`);
		if (this.segmentSize > SPLIT.BOUNDARIES.SEGMENT_SIZE.max)
			throw new Error(`segmentSize must be at most ${SPLIT.BOUNDARIES.SEGMENT_SIZE.max}`);
	}

	asLogMetadata(): Record<string, unknown> {
		return {
			batchSize: this.batchSize,
			segmentSize: this.segmentSize,
		};
	}
}
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
