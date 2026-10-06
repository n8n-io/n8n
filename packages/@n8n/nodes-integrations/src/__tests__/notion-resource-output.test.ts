import { fieldRefOf, lookupActionOf, lookupsOf, toNodeType } from '@n8n/node-sdk/host';
import { toContract } from '@n8n/node-sdk/registry';
import { mockHttp, runAction, sendRequest } from '@n8n/node-sdk/testing';
import { NotionApi } from 'n8n-nodes-base/dist/credentials/NotionApi.credentials';
import type { IHttpRequestOptions, ILoadOptionsFunctions } from 'n8n-workflow';

import { getManyDatabasePages } from '../nodes/notion/actions/database-page.get-all';

const fields = [
	{ name: 'Name', value: 'Name|title' },
	{ name: 'Status', value: 'Status|status' },
	{ name: 'Story Points', value: 'Story Points|number' },
	{ name: 'Rollup', value: 'Rollup|rollup' },
];

describe('notion.databasePage.getAll resourceOutput', () => {
	it('types every data source property and closes the key space', () => {
		const output = getManyDatabasePages.resourceOutput?.toOutput(fields, { database: 'x' });
		expect(output?.patternProperties).toBeUndefined();
		expect(output?.additionalProperties).toBe(false);
		expect(output?.properties).toMatchObject({
			property_name: { type: 'string' },
			property_status: { type: 'string' },
			property_story_points: { anyOf: [{ type: 'number' }, { type: 'null' }] },
			property_rollup: {},
		});
		expect(output?.required).toEqual([
			'id',
			'name',
			'url',
			'property_name',
			'property_status',
			'property_story_points',
		]);
	});

	it('keeps the filter-derived type of a property', () => {
		const output = getManyDatabasePages.resourceOutput?.toOutput(fields, {
			database: 'x',
			where: {
				match: 'all',
				conditions: [
					{
						property: 'Story Points',
						type: 'number',
						condition: { op: 'greater_than', value: 2 },
					},
				],
			},
		});
		expect(output?.properties?.property_story_points).toEqual({ type: 'number' });
		expect(output?.required?.filter((key) => key === 'property_story_points')).toHaveLength(1);
	});

	it('lists the properties of the data source, then of the database, with the node credential', async () => {
		const id = '0123456789abcdef0123456789abcdef';
		const url = `https://www.notion.so/Tasks-${id}`;
		const contract = toContract(getManyDatabasePages);
		expect(contract.output['x-n8n-resource']).toEqual({ input: 'database' });
		expect(fieldRefOf(contract.input, { database: url })).toMatchObject({
			resource: 'notion.database',
			id,
		});
		const fetch = mockHttp([
			{ path: `/v1/data_sources/${id}`, reply: { status: 404, json: { object: 'error' } } },
			{
				path: `/v1/databases/${id}`,
				reply: {
					json: {
						properties: {
							Name: { id: 'title', name: 'Name', type: 'title' },
							Done: { id: 'a%3Db', name: 'Done', type: 'checkbox' },
						},
					},
				},
			},
		]);
		const sent: string[] = [];
		const context = {
			getNode: () => ({
				id: '1',
				name: 'Notion',
				type: 'notion',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: { notionApi: { id: '1', name: 'Notion' } },
			}),
			getCurrentNodeParameters: () => ({ database: { __rl: true, mode: 'url', value: url } }),
			getCurrentNodeParameter: () => undefined,
			getCredentials: async () => ({}),
			helpers: {
				httpRequestWithAuthentication: async (type: string, options: IHttpRequestOptions) => {
					sent.push(type);
					return await sendRequest(fetch, options);
				},
			},
			logger: { debug: () => undefined },
		};
		const fields = new (toNodeType(getManyDatabasePages))().methods?.loadOptions?.[
			'notion.database'
		];
		// The lookup reads only these members.
		expect(await fields?.call(context as unknown as ILoadOptionsFunctions)).toEqual([
			{ name: 'Name', value: 'Name|title' },
			{ name: 'Done', value: 'Done|checkbox' },
		]);
		expect(fetch.calls.map(({ path, headers }) => [path, headers['notion-version']])).toEqual([
			[`/v1/data_sources/${id}`, '2026-03-11'],
			[`/v1/databases/${id}`, '2022-06-28'],
		]);
		expect(new Set(sent)).toEqual(new Set(['notionApi']));
	});
});

describe('notion.database lookup', () => {
	it('searches the data sources with the search text, page by page', async () => {
		const lookup = lookupsOf(toContract(getManyDatabasePages).input).get('notion.database');
		if (!lookup) throw new Error('notion.database has no lookup');
		const source = (id: string, title: string) => ({ id, title: [{ plain_text: title }] });
		const fetch = mockHttp([
			{
				method: 'POST',
				path: '/v1/search',
				reply: {
					json: { results: [source('a1', 'Tasks'), source('b2', 'Task log')], next_cursor: null },
				},
			},
		]);
		const result = await runAction(
			lookupActionOf(getManyDatabasePages, 'notion.database', lookup),
			{
				credential: { type: 'notionApi', data: { apiKey: 'secret_test' } },
				credentials: [new NotionApi()],
				input: { search: 'Task', paging: { mode: 'limit', max: 500 } },
				fetch,
			},
		);
		expect(result).toEqual({
			ok: true,
			items: [
				{ id: 'a1', label: 'Tasks' },
				{ id: 'b2', label: 'Task log' },
			],
		});
		expect(fetch.calls[0]?.body).toEqual({
			filter: { property: 'object', value: 'data_source' },
			query: 'Task',
			page_size: 100,
		});
		expect(fetch.calls[0]?.headers['notion-version']).toBe('2026-03-11');
	});
});
