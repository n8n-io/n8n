import { t } from '@n8n/node-sdk';

import { core } from '../core.node';

export const limitItems = core.action('limit', {
	action: 'Limit items',
	summary: 'Keep at most a number of items, from the start or the end. Items pass on unchanged.',
	flow: { effect: 'transform', cardinality: 'batch' },
	input: {
		maxItems: t.int().with({ minimum: 1 }).default(1),
		keep: t.oneOf('first', 'last').default('first'),
	},
	output: t.passedItem(),
	run({ input, items }) {
		const kept =
			input.keep === 'first' ? items.slice(0, input.maxItems) : items.slice(-input.maxItems);
		return kept.map((item) => ({ item }));
	},
});
