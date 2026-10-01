import { lit, nullable, obj, oneOf, str } from '@n8n/node-sdk';

import { NOTION_VERSION } from '../data-source';
import { user } from '../notion.node';

/** A Notion user. A person has `person.email`; a bot has `bot`. */
const notionUser = obj({
	object: lit('user'),
	id: str(),
	type: oneOf('person', 'bot').optional(),
	name: nullable(str()).optional(),
	avatar_url: nullable(str()).optional(),
}).with({ additionalProperties: true });

/** Declarative: the host sends the request. No code of this action runs. */
export const getUser = user.action('get', {
	patch: 1,
	action: 'Get a user',
	summary: 'Get one Notion user (a person or a bot) by ID.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	scopes: ['users:read'],
	input: {},
	output: notionUser,
	request: { method: 'GET', path: '/users/{user}', headers: NOTION_VERSION },
});
