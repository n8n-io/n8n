import { defineNode, defineResource, ref } from '@n8n/node-sdk';

export const notion = defineNode({
	id: 'notion',
	displayName: 'Notion',
	credentials: ['notionApi', 'notionOAuth2Api'],
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
