import { t } from '@n8n/node-sdk';

import { where, whereMatches } from '../condition';
import { conditionNode } from '../condition.node';

export const switchCases = conditionNode.action('switch', {
	action: 'Route items by cases',
	summary: 'Send each item to the output of the first case it matches, else to fallback.',
	flow: { effect: 'transform', cardinality: '1:N' },
	input: {
		cases: t
			.arr(
				t.obj({
					output: t.str().with({ minLength: 1, 'x-n8n-literal': true }).hint('Output name'),
					where,
				}),
			)
			.with({
				minItems: 1,
			}),
		allMatches: t.bool().default(false).hint('Send an item to every case it matches'),
	},
	output: t.passedItem(),
	outputs: { each: 'cases', then: ['fallback'] },
	async *run({ input, item }) {
		const matched = input.cases.filter((entry) => whereMatches(entry.where));
		const targets = input.allMatches ? matched : matched.slice(0, 1);
		if (targets.length === 0) yield { to: 'fallback', item };
		for (const target of targets) yield { to: target.output, item };
	},
});
