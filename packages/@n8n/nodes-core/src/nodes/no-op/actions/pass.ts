import { t } from '@n8n/node-sdk';

import { noOp } from '../no-op.node';

export const passItems = noOp.action('pass', {
	action: 'Do nothing',
	summary: 'Pass every item on unchanged.',
	flow: { effect: 'transform', cardinality: 'batch' },
	input: {},
	output: t.passedItem(),
	run: ({ items }) => items.map((item) => ({ item })),
});
