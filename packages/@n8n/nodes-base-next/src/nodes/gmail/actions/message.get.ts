import { t } from '@n8n/node-sdk';

import { message } from '../gmail.node';
import { getMessage, labelsOf, simplifiedMessage } from '../message';

export const getGmailMessage = message.action('get', {
	patch: 5,
	action: 'Get a message',
	summary: 'Get one message by ID.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: { messageId: t.str().hint('Gmail message ID, e.g. 182b676d244938bd') },
	output: simplifiedMessage,
	async run({ input, http }) {
		const labels = await labelsOf(http);
		return await getMessage(http, input.messageId, labels);
	},
});
