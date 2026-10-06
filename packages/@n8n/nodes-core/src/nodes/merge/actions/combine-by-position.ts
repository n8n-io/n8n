import { t } from '@n8n/node-sdk';

import { INPUT_COUNT, merge, mergeJson } from '../merge.node';

export const combineByPosition = merge.action('combineByPosition', {
	action: 'Combine items by position',
	summary: 'Join item i of each input into one item. Takes 2 to 10 inputs.',
	flow: { effect: 'transform', cardinality: 'batch' },
	inputs: { count: 'inputs' },
	input: {
		inputs: INPUT_COUNT,
		unpaired: t
			.bool()
			.default(false)
			.title('Include Any Unpaired Items')
			.hint('Keep a position that some inputs have no item at'),
		prefer: t
			.oneOf('first', 'last')
			.default('last')
			.title('When Field Values Clash')
			.hint('Which input wins a field clash: the first or the last'),
	},
	output: t.json().hint('The fields of the items at one position'),
	*run({ input, inputs }) {
		const lengths = inputs.map((items) => items.length);
		const count = input.unpaired ? Math.max(...lengths) : Math.min(...lengths);
		yield* Array.from({ length: count }, (_, index) => {
			const from = inputs.flatMap((items) => items[index] ?? []);
			const values = from.map(({ json }) => json);
			const json =
				input.prefer === 'last' ? mergeJson(...values) : mergeJson(...values, values[0] ?? {});
			return { json, from };
		});
	},
});
