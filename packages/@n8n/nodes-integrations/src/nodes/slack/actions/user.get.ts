import { parse, path, ref, t } from '@n8n/node-sdk';

import { slackResponse, slackUser, slackUserId, user } from '../slack.node';

const found = slackResponse({ user: slackUser });

export const getSlackUser = user.action('get', {
	action: 'Get a user',
	summary: 'Get a Slack user by user ID or by email address.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	minor: 1,
	scopes: ['users:read', 'users:read.email'],
	input: {
		user: t
			.variant('by', {
				id: { id: ref(slackUserId).title('User ID') },
				email: { email: t.str().with({ pattern: '^[^@\\s]+@[^@\\s]+$' }).title('Email') },
			})
			.title('User'),
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
