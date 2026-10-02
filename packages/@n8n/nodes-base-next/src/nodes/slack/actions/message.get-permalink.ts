import { ref, t } from '@n8n/node-sdk';

import { message, slackChannelId, slackGet, slackResponse, slackTs } from '../slack.node';

const link = slackResponse({ ok: t.bool(), channel: t.str(), permalink: t.str() });

export const getSlackPermalink = message.action('getPermalink', {
	action: 'Get a message permalink',
	summary: 'Get the URL of a message, to link it from elsewhere.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: { channel: ref(slackChannelId), ts: slackTs },
	output: link,
	async run({ input, http }) {
		const query = { channel: input.channel, message_ts: input.ts };
		return await slackGet(http, '/chat.getPermalink', query, link);
	},
});
