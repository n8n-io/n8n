import { ref, t } from '@n8n/node-sdk';

import {
	content,
	contentOf,
	message,
	slackChannelId,
	slackMessage,
	slackPost,
	slackResponse,
	slackTs,
} from '../slack.node';

const updated = slackResponse({
	ok: t.bool(),
	channel: t.str(),
	ts: t.str(),
	text: t.str(),
	message: slackMessage.optional(),
});

export const updateSlackMessage = message.action('update', {
	action: 'Update a message',
	summary: 'Replace the text or blocks of a message the app posted.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: true },
	scopes: ['chat:write'],
	input: { channel: ref(slackChannelId), ts: slackTs, ...content },
	output: updated,
	async run({ input, http }) {
		const body = { channel: input.channel, ts: input.ts, ...contentOf(input) };
		return await slackPost(http, '/chat.update', body, updated);
	},
});
