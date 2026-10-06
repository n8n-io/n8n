import { path, ref, t } from '@n8n/node-sdk';

import {
	content,
	contentOf,
	message,
	slackConversation,
	slackMessage,
	slackPost,
	slackResponse,
	slackTs,
} from '../slack.node';

const sent = slackResponse({
	ok: t.bool(),
	channel: t.str().hint('Channel ID, also when the input gave a #name'),
	ts: t.str().hint('ID of the new message; use it as threadTs to reply in its thread'),
	message: slackMessage,
});

export const sendSlackMessage = message.action('send', {
	action: 'Send a message',
	summary: 'Post a message to a Slack channel, a DM or a thread.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	scopes: ['chat:write'],
	input: {
		channel: ref(slackConversation),
		...content,
		threadTs: slackTs
			.hint('ts of the parent message, as a string, to reply in its thread')
			.optional(),
		replyBroadcast: t.bool().default(false).hint('Also show the thread reply in the channel'),
	},
	output: sent,
	async run({ input, http }) {
		const body = {
			channel: input.channel,
			...contentOf(input),
			...(input.threadTs ? { thread_ts: input.threadTs } : {}),
			...(input.threadTs && input.replyBroadcast ? { reply_broadcast: true } : {}),
		};
		return await slackPost(http, path`/chat.postMessage`, body, sent);
	},
});
