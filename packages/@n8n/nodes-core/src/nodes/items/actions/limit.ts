import { t } from '@n8n/node-sdk';

import { itemsNode } from '../items.node';

export const limitItems = itemsNode.action('limit', {
	action: 'Limit items',
	summary: 'Keep at most a number of items, from the start or the end. Items pass on unchanged.',
	flow: { effect: 'transform', cardinality: 'batch' },
	input: {
		maxItems: t.int().with({ minimum: 1 }).default(1).title('Max Items'),
		keep: t.oneOf('first', 'last').default('first').title('Keep'),
	},
	output: t.passedItem(),
	run({ input, items }) {
		const kept =
			input.keep === 'first' ? items.slice(0, input.maxItems) : items.slice(-input.maxItems);
		return kept.map((item) => ({ item }));
	},
});
