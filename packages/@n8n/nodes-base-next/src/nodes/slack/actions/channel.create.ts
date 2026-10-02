import { t } from '@n8n/node-sdk';

import { channel, slackChannel, slackPost, slackResponse } from '../slack.node';

const created = slackResponse({ channel: slackChannel });

export const createSlackChannel = channel.action('create', {
	action: 'Create a channel',
	summary: 'Create a public or private Slack channel.',
	flow: { effect: 'write', cardinality: 'per-item', idempotent: false },
	scopes: ['channels:manage', 'groups:write'],
	input: {
		name: t
			.str()
			.with({ pattern: '^#?[a-z0-9_-]{1,80}$' })
			.hint('Lower case letters, digits, - and _; at most 80 characters'),
		isPrivate: t.bool().default(false),
	},
	output: slackChannel,
	async run({ input, http }) {
		const body = { name: input.name.replace(/^#/, ''), is_private: input.isPrivate };
		return (await slackPost(http, '/conversations.create', body, created)).channel ?? {};
	},
});
