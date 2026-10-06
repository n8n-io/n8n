import { path, ref, t } from '@n8n/node-sdk';

import { reaction, slackChannelId, slackPost, slackResponse, slackTs } from '../slack.node';

const added = t.loose(t.obj({ ok: t.bool() }));

export const addSlackReaction = reaction.action('add', {
	action: 'Add a reaction',
	summary: 'Add an emoji reaction to a message.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	scopes: ['reactions:write'],
	input: {
		channel: ref(slackChannelId).title('Channel'),
		ts: slackTs.title('Message Timestamp'),
		name: t
			.str()
			.with({ pattern: "^[a-z0-9_+'-]+$" })
			.title('Emoji Code')
			.hint('Emoji name without colons, e.g. white_check_mark'),
	},
	output: added,
	async run({ input, http }) {
		const body = { channel: input.channel, name: input.name, timestamp: input.ts };
		const { ok } = await slackPost(
			http,
			path`/reactions.add`,
			body,
			slackResponse({ ok: t.bool() }),
		);
		return { ok };
	},
});
