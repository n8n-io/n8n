import { defineNode, defineResource, ref, t } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { notionOAuth2, notionToken } from './credentials';
import { NOTION_VERSION } from './data-source';

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

/** The data sources that the integration can read; a data source ID also names its database. */
const dataSourceList = {
	request: {
		method: 'POST',
		path: '/search',
		headers: NOTION_VERSION,
		body: { filter: { property: 'object', value: 'data_source' }, query: { input: 'search' } },
	},
	response: t.obj({
		results: t.arr(t.obj({ id: t.str(), title: t.arr(t.obj({ plain_text: t.str() })) })),
		next_cursor: t.nullable(t.str()).optional(),
	}),
	items: 'results',
	item: { id: '{id}', label: '{title.0.plain_text}' },
	pages: {
		style: 'cursor',
		next: 'next_cursor',
		send: { body: 'start_cursor' },
		size: { body: 'page_size', max: 100 },
	},
	search: 'service',
} as const;

export const notionDatabase = defineResource({
	id: 'notion.database',
	label: 'Database',
	shape: { pattern: ID, 'x-n8n-hint': 'Notion database ID or URL; 32 hex digits' },
	list: dataSourceList,
});

export const notionIdOf = (value: string) => new RegExp(ID).exec(value)?.[0] ?? value;

export const databasePage = notion.resource('databasePage', {
	input: { database: ref(notionDatabase) },
});

/** A declarative request has no code to read an ID out of a URL. */
const exactId = (label: string) => ({
	pattern: `^${ID}$`,
	'x-n8n-hint': `Notion ${label.toLowerCase()} ID; 32 hex digits, no URL`,
});

export const dataSource = notion.resource('dataSource', {
	input: {
		dataSource: ref(
			defineResource({
				id: 'notion.datasource',
				label: 'Data Source',
				shape: exactId('Data Source'),
				list: dataSourceList,
			}),
		),
	},
});

export const user = notion.resource('user', {
	input: {
		user: ref(
			defineResource({
				id: 'notion.user',
				label: 'User',
				shape: exactId('User'),
				list: {
					request: { path: '/users', headers: NOTION_VERSION },
					response: t.obj({
						results: t.arr(t.obj({ id: t.str(), name: t.nullable(t.str()).optional() })),
						next_cursor: t.nullable(t.str()).optional(),
					}),
					items: 'results',
					item: { id: '{id}', label: '{name}' },
					pages: {
						style: 'cursor',
						next: 'next_cursor',
						send: { query: 'start_cursor' },
						size: { query: 'page_size', max: 100 },
					},
					// GET /users has no name filter.
					search: 'label',
				},
			}),
		),
	},
});
