import { t } from '@n8n/node-sdk';

import { INPUT_COUNT, merge } from '../merge.node';

export const appendItems = merge.action('append', {
	// Major 2: 2 to 10 counted inputs, not left and right.
	version: '2.0.0',
	action: 'Append items',
	summary: 'Emit the items of each input, input 1 first. Items pass on unchanged.',
	flow: { effect: 'transform', cardinality: 'batch' },
	inputs: { count: 'inputs' },
	input: { inputs: INPUT_COUNT },
	output: t.passedItem(),
	*run({ inputs }) {
		for (const items of inputs) yield* items.map((item) => ({ item }));
	},
});
