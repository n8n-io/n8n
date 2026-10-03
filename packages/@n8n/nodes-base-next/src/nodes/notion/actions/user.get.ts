import { t } from '@n8n/node-sdk';

import { NOTION_VERSION } from '../data-source';
import { user } from '../notion.node';

/** A Notion user. A person has `person.email`; a bot has `bot`. */
const notionUser = t
	.obj({
		object: t.lit('user'),
		id: t.str(),
		type: t.oneOf('person', 'bot').optional(),
		name: t.nullable(t.str()).optional(),
		avatar_url: t.nullable(t.str()).optional(),
	})
	.with({ additionalProperties: true });

/** Declarative: the host sends the request. No code of this action runs. */
export const getUser = user.action('get', {
	action: 'Get a user',
	summary: 'Get one Notion user (a person or a bot) by ID.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	scopes: ['users:read'],
	input: {},
	output: notionUser,
	request: { method: 'GET', path: '/users/{user}', headers: NOTION_VERSION },
});
