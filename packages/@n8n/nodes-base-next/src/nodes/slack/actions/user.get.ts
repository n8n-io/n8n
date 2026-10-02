import { str, variant } from '@n8n/node-sdk';

import { slackGet, slackResponse, slackUser, user } from '../slack.node';

const found = slackResponse({ user: slackUser });

export const getSlackUser = user.action('get', {
	action: 'Get a user',
	summary: 'Get a Slack user by user ID or by email address.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	scopes: ['users:read', 'users:read.email'],
	input: {
		user: variant('by', {
			id: { id: str().with({ pattern: '^[UW][A-Z0-9]{2,}$' }).hint('User ID, e.g. U0123ABCDEF') },
			email: { email: str().with({ pattern: '^[^@\\s]+@[^@\\s]+$' }) },
		}),
	},
	output: slackUser,
	async run({ input, http }) {
		const { user: target } = input;
		const body =
			target.by === 'id'
				? await slackGet(http, '/users.info', { user: target.id }, found)
				: await slackGet(http, '/users.lookupByEmail', { email: target.email }, found);
		return body.user ?? {};
	},
});
