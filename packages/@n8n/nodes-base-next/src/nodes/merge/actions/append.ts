import { t } from '@n8n/node-sdk';

import { INPUTS, merge } from '../merge.node';

export const appendItems = merge.action('append', {
	action: 'Append items',
	summary: 'Emit the items of left, then the items of right. Items pass on unchanged.',
	flow: { effect: 'transform', cardinality: 'batch' },
	inputs: INPUTS,
	input: {},
	output: t.passedItem(),
	*run({ inputs }) {
		yield* inputs.left.map((item) => ({ item }));
		yield* inputs.right.map((item) => ({ item }));
	},
});
