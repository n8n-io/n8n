import { ref, t } from '@n8n/node-sdk';

import { message, slackChannelId, slackPost, slackResponse, slackTs } from '../slack.node';

const deleted = slackResponse({ ok: t.bool(), channel: t.str(), ts: t.str() });

export const deleteSlackMessage = message.action('delete', {
	action: 'Delete a message',
	summary: 'Delete a message that the app posted.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	scopes: ['chat:write'],
	input: { channel: ref(slackChannelId), ts: slackTs },
	output: deleted,
	async run({ input, http }) {
		const body = { channel: input.channel, ts: input.ts };
		return await slackPost(http, '/chat.delete', body, deleted);
	},
});
