import { NotionApi } from 'n8n-nodes-base/dist/credentials/NotionApi.credentials';
import { Notion } from 'n8n-nodes-base/dist/nodes/Notion/Notion.node';

import { getManyDatabasePages } from '../../nodes/notion/actions/database-page.get-all';
import {
	actionNode,
	compareRuns,
	runNode,
	type AllowedDifference,
	type ParityCase,
} from './harness';

const DATA_SOURCE = '2a3b4c5d6e7f40818293a4b5c6d7e8f9';
const QUERY = `https://api.notion.com/v1/data_sources/${DATA_SOURCE}/query`;

const page = (name: string, title: string) => ({
	object: 'page',
	id: `2a3b4c5d-6e7f-4081-8293-${name.padStart(12, '0')}`,
	url: `https://www.notion.so/${name}`,
	parent: { type: 'data_source_id', data_source_id: DATA_SOURCE },
	properties: {
		Name: { id: 'title', type: 'title', title: [{ type: 'text', plain_text: title }] },
		Status: { id: 's', type: 'status', status: { name: 'Done' } },
		Notes: {
			id: 'r',
			type: 'rich_text',
			rich_text: [
				{ type: 'text', plain_text: 'Ask ' },
				{ type: 'mention', plain_text: '@Ada' },
			],
		},
		Due: { id: 'd', type: 'date', date: { start: '2026-09-03', end: null, time_zone: null } },
		Owners: { id: 'o', type: 'people', people: [{ object: 'user', person: { email: 'a@x.io' } }] },
		'Story Points': { id: 'n', type: 'number', ['number']: 3 },
		Tags: { id: 't', type: 'multi_select', multi_select: [{ name: 'web' }] },
		Priority: { id: 'p', type: 'select', select: null },
		Done: { id: 'c', type: 'checkbox', checkbox: true },
		Link: { id: 'u', type: 'url', url: null },
		Related: { id: 'l', type: 'relation', relation: [{ id: 'rel-1' }] },
		Score: { id: 'f', type: 'formula', formula: { type: 'number', ['number']: 7 } },
		Total: {
			id: 'x',
			type: 'rollup',
			rollup: { type: 'number', ['number']: 9, function: 'count' },
		},
		Files: {
			id: 'i',
			type: 'files',
			files: [{ name: 'a.pdf', type: 'file', file: { url: 'https://files.example/a.pdf' } }],
		},
	},
});

const parityCase: ParityCase = {
	credential: { data: { apiKey: 'secret_parity' }, types: [new NotionApi()] },
	input: [{}],
	routes: [
		// Only the action resolves a database ID; the legacy node takes a data source ID.
		{
			method: 'GET',
			url: `https://api.notion.com/v1/databases/${DATA_SOURCE}`,
			json: { object: 'database', data_sources: [{ id: DATA_SOURCE }] },
		},
		{
			method: 'POST',
			url: QUERY,
			times: 1,
			json: {
				results: [page('1', 'One'), page('2', 'Two')],
				next_cursor: 'cursor-2',
				has_more: true,
			},
		},
		{
			method: 'POST',
			url: QUERY,
			times: 1,
			json: {
				results: [page('3', 'Three'), page('4', 'Four')],
				next_cursor: null,
				has_more: false,
			},
		},
	],
};

const ALLOWED: readonly AllowedDifference[] = [
	{
		path: `requests.GET https://api.notion.com/v1/databases/${DATA_SOURCE} #0`,
		kind: 'intended',
		reason: 'The action also takes a database ID and resolves it to its first data source.',
	},
	...[0, 1].map(
		(index): AllowedDifference => ({
			path: `requests.POST ${QUERY} #${index}.body.filter.and[2].date.on_or_after`,
			kind: 'intended',
			reason:
				'The action sends the ISO date as given; the legacy node converts it to a UTC time in the workflow timezone.',
		}),
	),
	{
		path: `requests.POST ${QUERY} #1.body.page_size`,
		kind: 'intended',
		reason:
			'The action asks the next page only for the pages the limit still needs; the legacy node repeats the first page size.',
	},
	...[0, 1, 2].map(
		(index): AllowedDifference => ({
			path: `items[${index}].json.property_notes`,
			kind: 'intended',
			reason:
				'The action keeps plain_text of mention and equation rich text; the legacy node drops it.',
		}),
	),
];

describe('notion.databasePage.getAll parity with Notion v3 databasePage getAll', () => {
	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			{
				nodeType: new Notion(),
				type: 'n8n-nodes-base.notion',
				typeVersion: 3,
				credential: 'notionApi',
				parameters: {
					resource: 'databasePage',
					operation: 'getAll',
					dataSourceId: { __rl: true, mode: 'id', value: DATA_SOURCE },
					returnAll: false,
					limit: 3,
					filterType: 'manual',
					matchType: 'allFilters',
					filters: {
						conditions: [
							{ key: 'Status|status', condition: 'equals', optionValue: 'Done' },
							{ key: 'Story Points|number', condition: 'greater_than', numberValue: 2 },
							{ key: 'Due|date', condition: 'on_or_after', dateValue: '2026-09-01' },
						],
					},
					simple: true,
					options: {
						sort: {
							sortValue: [{ timestamp: false, key: 'Name|title', direction: 'ascending' }],
						},
					},
				},
			},
			parityCase,
		);
		const next = await runNode(
			actionNode(
				getManyDatabasePages,
				{
					authentication: 'notionApi',
					database: DATA_SOURCE,
					where: {
						match: 'all',
						conditions: [
							{ property: 'Status', type: 'status', condition: { op: 'equals', value: 'Done' } },
							{
								property: 'Story Points',
								type: 'number',
								condition: { op: 'greater_than', value: 2 },
							},
							{
								property: 'Due',
								type: 'date',
								condition: { op: 'on_or_after', value: '2026-09-01' },
							},
						],
					},
					limit: 3,
					sort: [{ by: 'property', property: 'Name', direction: 'ascending' }],
				},
				'notionApi',
			),
			parityCase,
		);
		expect(legacy.error).toBeUndefined();
		expect(legacy.items).toHaveLength(3);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});
