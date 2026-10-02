import { t } from '@n8n/node-sdk';

import { where, whereMatches } from '../condition';
import { core } from '../core.node';

export const ifCondition = core.action('if', {
	action: 'Route items by a condition',
	summary: 'Send each item to true or false by its conditions. The item passes on unchanged.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: { where },
	output: t.passedItem(),
	outputs: ['true', 'false'],
	run: async ({ input, item }) =>
		await Promise.resolve({ to: whereMatches(input.where) ? 'true' : 'false', item }),
});
