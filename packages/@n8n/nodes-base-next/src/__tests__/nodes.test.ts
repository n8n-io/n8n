import { lintContract, toContract, toNodeType, validate, type Action } from '@n8n/node-sdk';
import type { IExecuteFunctions } from 'n8n-workflow';
 
import { simplifyObjects } from 'n8n-nodes-base/dist/nodes/Notion/shared/GenericFunctions';

import { actions, nodeTypeOf } from '../index';
import { sendRequest } from '../nodes/http/request';
import { getManyDatabasePages } from '../nodes/notion/database-page.get-all';

const page = (id: string) => ({
	object: 'page',
	id,
	url: `https://www.notion.so/${id}`,
	parent: { type: 'data_source_id', data_source_id: 'ds' },
	properties: {
		Name: { id: 'title', type: 'title', title: [{ type: 'text', plain_text: 'Launch v2' }] },
		Status: { id: 's', type: 'status', status: { name: 'Done' } },
		Completed: { id: 'c', type: 'date', date: { start: '2026-09-03', end: null, time_zone: null } },
		Owners: { id: 'o', type: 'people', people: [{ object: 'user', person: { email: 'a@x.io' } }] },
		'Story Points': { id: 'n', type: 'number', ['number']: 3 },
		Tags: { id: 't', type: 'multi_select', multi_select: [{ name: 'web' }] },
		Done: { id: 'd', type: 'checkbox', checkbox: true },
	},
});

interface Call {
	credentialType: string;
	options: { url: string; body?: { start_cursor?: string; filter?: unknown; page_size?: number } };
}

function run(
	action: Action,
	parameters: Record<string, unknown>,
	respond: (call: Call) => unknown,
) {
	const calls: Call[] = [];
	const context = {
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Node', credentials: { notionApi: { id: '1', name: 'Notion' } } }),
		getNodeParameter: (name: string) => parameters[name],
		continueOnFail: () => false,
		helpers: {
			httpRequestWithAuthentication: async (credentialType: string, options: Call['options']) => {
				const call = { credentialType, options };
				calls.push(call);
				return respond(call);
			},
			httpRequest: async (options: Call['options']) => {
				const call = { credentialType: '', options };
				calls.push(call);
				return respond(call);
			},
		},
	};
	const NodeType = toNodeType(action);
	// The runtime reads only these members.
	const result = new NodeType().execute?.call(context as unknown as IExecuteFunctions);
	const execute = result?.then((output) => (Array.isArray(output) ? output : []));
	return { execute, calls };
}

describe('contracts', () => {
	it('lint clean and map to node types', () => {
		expect(actions.flatMap((action) => lintContract(toContract(action)))).toEqual([]);
		expect(nodeTypeOf(getManyDatabasePages)).toBe('@n8n/nodes-base-next.notionDatabasePageGetAll');
	});
});

describe('notion.databasePage.getAll', () => {
	const where = {
		match: 'all',
		conditions: [
			{ property: 'Status', type: 'status', condition: { op: 'equals', value: 'Done' } },
			{
				property: 'Completed',
				type: 'date',
				condition: { op: 'on_or_after', value: '2026-09-01' },
			},
			{ property: 'Owners', type: 'people', condition: { op: 'contains', value: 'u-1' } },
			{ property: 'Notes', type: 'rich_text', condition: { op: 'is_empty' } },
		],
	} as const;

	it('queries the data source with a Notion filter, pages by cursor, and simplifies like v3', async () => {
		const { execute, calls } = run(
			getManyDatabasePages,
			{ database: 'https://www.notion.so/5b9e2c1d0a7f4c3e9d217f6a8b9c0d1e?v=1', where, limit: 3 },
			({ options }) => {
				if (options.url.includes('/databases/')) return { data_sources: [{ id: 'ds-1' }] };
				return options.body?.start_cursor
					? { results: [page('p3'), page('p4')], next_cursor: null }
					: { results: [page('p1'), page('p2')], next_cursor: 'c2' };
			},
		);
		const [items = []] = (await execute) ?? [];

		expect(calls.map((call) => call.options.url)).toEqual([
			'https://api.notion.com/v1/databases/5b9e2c1d0a7f4c3e9d217f6a8b9c0d1e',
			'https://api.notion.com/v1/data_sources/ds-1/query',
			'https://api.notion.com/v1/data_sources/ds-1/query',
		]);
		expect(calls[1]?.options.body).toEqual({
			filter: {
				and: [
					{ property: 'Status', status: { equals: 'Done' } },
					{ property: 'Completed', date: { on_or_after: '2026-09-01' } },
					{ property: 'Owners', people: { contains: 'u-1' } },
					{ property: 'Notes', rich_text: { is_empty: true } },
				],
			},
			page_size: 3,
		});
		expect(items.map((item) => item.json.id)).toEqual(['p1', 'p2', 'p3']);
		expect(items[0]?.json).toEqual(simplifyObjects([page('p1')], false, 3)[0]);
	});

	it('derives the fields an AND filter guarantees', () => {
		const output = getManyDatabasePages.deriveOutput?.({
			database: 'x',
			where: { match: 'all', conditions: where.conditions },
		});
		expect(output?.properties).toMatchObject({
			property_status: { type: 'string' },
			property_completed: { type: 'object', required: ['start', 'end', 'time_zone'] },
			property_owners: { type: 'array' },
			property_notes: { type: 'string' },
		});
		expect(output?.required).toEqual([
			'id',
			'name',
			'url',
			'property_status',
			'property_completed',
			'property_owners',
			'property_notes',
		]);
	});

	it('rejects an unknown operator for the property type', () => {
		const issues = validate(
			{
				database: 'x',
				where: {
					match: 'all',
					conditions: [
						{ property: 'Due', type: 'date', condition: { op: 'contains', value: 'x' } },
					],
				},
			},
			getManyDatabasePages.inputSchema,
		);
		expect(issues.join()).toContain(
			'input.where.conditions[0].condition: needs "op" set to one of',
		);
	});
});

describe('httpRequest.send', () => {
	it('sends a JSON body and emits the response', async () => {
		const { execute, calls } = run(
			sendRequest,
			{
				method: 'POST',
				url: 'https://reports.test/done',
				body: { kind: 'json', json: { name: 'Launch v2' } },
			},
			() => ({ ok: true }),
		);
		const [items = []] = (await execute) ?? [];
		expect(calls[0]?.options).toMatchObject({
			url: 'https://reports.test/done',
			body: { name: 'Launch v2' },
		});
		expect(items.map((item) => item.json)).toEqual([{ ok: true }]);
	});
});
