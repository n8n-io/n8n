import { t } from '@n8n/node-sdk';

import { where, whereMatches } from '../condition';
import { core } from '../core.node';

export const filterItems = core.action('filter', {
	action: 'Filter items',
	summary: 'Keep the items that match the conditions. Other items go to discarded, unchanged.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: { where },
	output: t.passedItem(),
	outputs: ['kept', 'discarded'],
	run: async ({ input, item }) =>
		await Promise.resolve({ to: whereMatches(input.where) ? 'kept' : 'discarded', item }),
});
