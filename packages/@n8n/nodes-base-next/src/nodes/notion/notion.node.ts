import { defineNode, defineResource, ref } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { notionOAuth2, notionToken } from './credentials';

export const notion = defineNode({
	id: 'notion',
	displayName: 'Notion',
	// The scopes are the capabilities of a Notion integration. The user sets them in Notion.
	credential: credential({
		types: [notionToken, notionOAuth2],
		scopes: {
			'content:read': 'Read pages, databases and data sources',
			'content:update': 'Update pages and databases',
			'content:insert': 'Create pages and databases',
			'comments:read': 'Read comments',
			'comments:insert': 'Create comments',
			'users:read': 'Read users without their email',
		},
	}),
	baseUrl: 'https://api.notion.com/v1',
});

const ID = '[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}';

export const notionDatabase = defineResource({
	id: 'notion.database',
	label: 'Database',
	shape: { pattern: ID, 'x-n8n-hint': 'Notion database ID or URL; 32 hex digits' },
});

export const notionIdOf = (value: string) => new RegExp(ID).exec(value)?.[0] ?? value;

export const databasePage = notion.resource('databasePage', {
	input: { database: ref(notionDatabase) },
});

const notionId = (label: string) =>
	defineResource({
		id: `notion.${label.toLowerCase().replace(/ /g, '')}`,
		label,
		// A declarative request has no code to read an ID out of a URL.
		shape: {
			pattern: `^${ID}$`,
			'x-n8n-hint': `Notion ${label.toLowerCase()} ID; 32 hex digits, no URL`,
		},
	});

export const dataSource = notion.resource('dataSource', {
	input: { dataSource: ref(notionId('Data Source')) },
});

export const user = notion.resource('user', { input: { user: ref(notionId('User')) } });
