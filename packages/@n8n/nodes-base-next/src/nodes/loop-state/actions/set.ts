import { t } from '@n8n/node-sdk';

import { loopState } from '../loop-state.node';

export const setLoopState = loopState.action('set', {
	action: 'Set the loop state',
	summary: 'Emit one item per item: the state of the next loop pass. The loop regions build it.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: { state: t.json().hint('The next item, usually a ={{ ({ ... }) }} expression') },
	// The flow SDK types the state of each loop, so the contract keeps it open.
	output: t.json(),
	run: async ({ input }) => await Promise.resolve(input.state),
});
