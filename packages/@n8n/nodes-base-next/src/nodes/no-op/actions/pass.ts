import { passedItem } from '@n8n/node-sdk';

import { noOp } from '../no-op.node';

export const passItems = noOp.action('pass', {
	action: 'Do nothing',
	summary: 'Pass every item on unchanged.',
	flow: { effect: 'transform', cardinality: 'batch' },
	input: {},
	output: passedItem(),
	run: ({ items }) => items.map((item) => ({ item })),
});
