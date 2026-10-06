import { parse, path, ref, t } from '@n8n/node-sdk';

import { message, slackChannelId, slackResponse, slackTs } from '../slack.node';

const link = slackResponse({ ok: t.bool(), channel: t.str(), permalink: t.str() });

export const getSlackPermalink = message.action('getPermalink', {
	action: 'Get a message permalink',
	summary: 'Get the URL of a message, to link it from elsewhere.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: {
		channel: ref(slackChannelId).title('Channel'),
		ts: slackTs.title('Message Timestamp'),
	},
	output: link,
	async run({ input, http }) {
		const query = { channel: input.channel, message_ts: input.ts };
		return parse(link, await http.request({ path: path`/chat.getPermalink`, query }));
	},
});
