import { t, UserError } from '@n8n/node-sdk';

import { stopAndError } from '../stop-and-error.node';

export const stopWithError = stopAndError.action('stop', {
	action: 'Stop with an error',
	summary: 'Fail the execution with this message when items arrive. It emits no item.',
	flow: { effect: 'transform', cardinality: 'batch' },
	input: {
		message: t.str().with({ minLength: 1 }),
		description: t.str().optional().hint('More detail n8n shows under the message'),
	},
	output: t.passedItem(),
	// eslint-disable-next-line require-yield -- the action ends every run with its error
	*run({ input }) {
		throw new UserError(input.message, { description: input.description });
	},
});
