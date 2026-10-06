import { t, UserError } from '@n8n/node-sdk';

import { INPUT_COUNT, merge } from '../merge.node';

export const chooseBranch = merge.action('chooseBranch', {
	action: 'Choose branch',
	summary:
		'Wait for every input, then emit the items of one input. Items pass on unchanged. Takes 2 to 10 inputs.',
	flow: { effect: 'transform', cardinality: 'batch' },
	inputs: { count: 'inputs' },
	input: {
		inputs: INPUT_COUNT,
		use: t
			.int()
			.with({ minimum: 1, maximum: 10 })
			.default(1)
			.title('Use Data of Input')
			.hint('The input whose items pass on, from 1'),
	},
	output: t.passedItem(),
	*run({ input, inputs }) {
		const items = inputs[input.use - 1];
		if (items === undefined) {
			throw new UserError(
				`Input ${input.use} does not exist: the node has ${inputs.length} inputs`,
			);
		}
		yield* items.map((item) => ({ item }));
	},
});
