import { parse, path, t } from '@n8n/node-sdk';

import { slackResponse, slackUser, user } from '../slack.node';

const found = slackResponse({ user: slackUser });

export const getSlackUser = user.action('get', {
	action: 'Get a user',
	summary: 'Get a Slack user by user ID or by email address.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	scopes: ['users:read', 'users:read.email'],
	input: {
		user: t.variant('by', {
			id: { id: t.str().with({ pattern: '^[UW][A-Z0-9]{2,}$' }).hint('User ID, e.g. U0123ABCDEF') },
			email: { email: t.str().with({ pattern: '^[^@\\s]+@[^@\\s]+$' }) },
		}),
	},
	output: slackUser,
	async run({ input, http }) {
		const { user: target } = input;
		const request =
			target.by === 'id'
				? { path: path`/users.info`, query: { user: target.id } }
				: { path: path`/users.lookupByEmail`, query: { email: target.email } };
		return parse(found, await http.request(request)).user ?? {};
	},
});
