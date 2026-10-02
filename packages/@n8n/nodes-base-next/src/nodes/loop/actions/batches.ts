import { t } from '@n8n/node-sdk';

import { loop } from '../loop.node';

/** Loop Over Items (Split in Batches), version 3. */
export const loopBatches = loop.action('batches', {
	action: 'Loop over items in batches',
	summary:
		'Emits the input items in batches on loop. When no batch is left, emits all returned items on done.',
	flow: { effect: 'transform', cardinality: 'batch' },
	outputs: ['done', 'loop'],
	input: {
		batchSize: t.int().with({ minimum: 1 }).hint('Items in each batch'),
		options: t
			.obj({
				reset: t
					.bool()
					.optional()
					.hint('true: take the input as a new list, e.g. for a loop nested in another loop'),
			})
			.optional(),
	},
	output: t.passedItem(),
	native: { type: 'n8n-nodes-base.splitInBatches', version: 3 },
});
