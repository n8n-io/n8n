import { t } from '@n8n/node-sdk';

import { message } from '../gmail.node';
import {
	attachmentPrefix,
	downloadAttachments,
	getFullMessage,
	getMessage,
	labelsOf,
	messageOutput,
	messageOutputOf,
	simplify,
} from '../message';

export const getGmailMessage = message.action('get', {
	// Major 2: `simplify: false` gives the full parsed mail.
	version: 2,
	action: 'Get a message',
	summary: 'Get one message by ID.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: {
		messageId: t.str().title('Message ID').hint('Gmail message ID, e.g. 182b676d244938bd'),
		simplify,
		downloadAttachments,
		attachmentPrefix,
	},
	output: messageOutput,
	deriveOutput: messageOutputOf,
	async run({ input, http, binary }) {
		if (!input.simplify) return await getFullMessage(http, input.messageId, { ...input, binary });
		const labels = await labelsOf(http);
		return await getMessage(http, input.messageId, labels);
	},
});
