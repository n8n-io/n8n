import { defineAction, str } from '@n8n/node-sdk';

import { getMessage, gmail, labelsOf, simplifiedMessage } from './node';

export const getGmailMessage = defineAction({
	node: gmail,
	id: 'gmail.message.get',
	action: 'Get a message',
	summary: 'Get one message by ID.',
	flow: { effect: 'read', cardinality: 'per-item', passthrough: 'replace', idempotent: true },
	input: { messageId: str().hint('Gmail message ID, e.g. 182b676d244938bd') },
	output: simplifiedMessage,
	async run({ input, http, emit }) {
		const labels = await labelsOf(http);
		emit(await getMessage(http, input.messageId, labels));
	},
});
