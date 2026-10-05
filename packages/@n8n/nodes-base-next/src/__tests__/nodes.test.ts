import { validate, type Action } from '@n8n/node-sdk';
import { toNodeType } from '@n8n/node-sdk/host';
import { credentialTypesOf } from '@n8n/node-sdk/freeze';
import { checkAction, checkCredentialType } from '@n8n/node-sdk/registry';
import { mockHttp, runAction } from '@n8n/node-sdk/testing';
import type { IExecuteFunctions } from 'n8n-workflow';

import { passItems } from '@n8n/nodes-core';
import { simplifyObjects } from 'n8n-nodes-base/dist/nodes/Notion/shared/GenericFunctions';

import {
	actions,
	FIRST_PARTY_PACKAGES,
	isContractNodeType,
	nodeTypeOf,
	packageOf,
	triggers,
	versionsOf,
} from '../index';
import { dateTime } from '../nodes/items/actions/date-time';
import { getRequest } from '../nodes/http-request/actions/get';
import { sendRequest } from '../nodes/http-request/actions/send';
import { getManyDatabasePages } from '../nodes/notion/actions/database-page.get-all';

const pageId = (name: string) => `2a3b4c5d-6e7f-4081-8293-${name.padStart(12, '0')}`;

const page = (name: string) => ({
	object: 'page',
	id: pageId(name),
	url: `https://www.notion.so/${name}`,
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
	options: {
		url: string;
		qs?: Record<string, unknown>;
		body?: { start_cursor?: string; filter?: unknown; page_size?: number };
	};
}

function run(
	action: Action,
	parameters: Record<string, unknown>,
	respond: (call: Call) => unknown,
) {
	const calls: Call[] = [];
	const hints: Array<{ message: string }> = [];
	const context = {
		addExecutionHints: (...added: Array<{ message: string }>) => hints.push(...added),
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Node', credentials: { notionApi: { id: '1', name: 'Notion' } } }),
		getNodeParameter: (name: string) => parameters[name],
		getCredentials: async () => ({}),
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
	return { execute, calls, hints };
}

describe('contracts', () => {
	it('pass the checks of n8n-node-next check and map to node types', () => {
		expect([...actions, ...triggers].flatMap(checkAction)).toEqual([]);
		expect(FIRST_PARTY_PACKAGES.flatMap(credentialTypesOf).flatMap(checkCredentialType)).toEqual(
			[],
		);
		expect(nodeTypeOf(getManyDatabasePages)).toBe('@n8n/nodes-base-next.notionDatabasePageGetAll');
	});
});

describe('first-party packages', () => {
	it('ship each id once, and name the node types of their contracts', () => {
		const ids = FIRST_PARTY_PACKAGES.flatMap((pkg) =>
			[...pkg.actions, ...pkg.triggers, ...pkg.natives].map(({ id }) => id),
		);
		expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
		expect(actions).toContain(passItems);
		expect(nodeTypeOf(passItems)).toBe('@n8n/nodes-core.noOpPass');
		expect(isContractNodeType('@n8n/nodes-core.noOpPass')).toBe(true);
		expect(isContractNodeType('@n8n/nodes-base-next.httpRequestGet')).toBe(true);
		expect(isContractNodeType('n8n-nodes-base.noOp')).toBe(false);
	});

	it('bundle the versions of each package as first-party', () => {
		expect(versionsOf('noOp.pass').map(({ manifest, origin }) => [manifest.id, origin])).toEqual([
			['noOp.pass', 'first-party'],
		]);
	});

	it('give a stored id that no package ships to the first package', () => {
		expect(packageOf('community.thing.do').name).toBe('@n8n/nodes-base-next');
		expect(nodeTypeOf({ id: 'community.thing.do' })).toBe('@n8n/nodes-base-next.communityThingDo');
	});
});

describe('items.dateTime', () => {
	it('refuses a fraction of a calendar unit and adds a fraction of a fixed unit', async () => {
		const add = async (amount: number, unit: string) =>
			await runAction(dateTime, {
				input: { date: '2026-01-15T00:00:00Z', operation: { op: 'add', amount, unit } },
			});
		expect(await add(1.5, 'months')).toMatchObject({
			ok: false,
			error: { message: expect.stringContaining('whole number') },
		});
		expect(await add(1.5, 'hours')).toEqual({
			ok: true,
			items: [{ newDate: '2026-01-15T01:30:00.000Z' }],
		});
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
					? { results: [page('3'), page('4')], next_cursor: null }
					: { results: [page('1'), page('2')], next_cursor: 'c2' };
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
		expect(items.map((item) => item.json.id)).toEqual(['1', '2', '3'].map(pageId));
		expect(items[0]?.json).toEqual(simplifyObjects([page('1')], false, 3)[0]);
	});

	it('emits a page with a missing field and names it in a warning', async () => {
		const { url: _url, ...withoutUrl } = page('1');
		const { execute, hints } = run(
			getManyDatabasePages,
			{ database: '5b9e2c1d0a7f4c3e9d217f6a8b9c0d1e' },
			({ options }) =>
				options.url.includes('/databases/')
					? { data_sources: [{ id: 'ds-1' }] }
					: { results: [withoutUrl], next_cursor: null },
		);
		expect((await execute)?.[0]?.map((item) => item.json.id)).toEqual([pageId('1')]);
		expect(hints.map(({ message }) => message)).toEqual([
			expect.stringContaining('output[0].url: is required'),
		]);
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

	const DATA_SOURCE = '2a3b4c5d6e7f40818293a4b5c6d7e8f9';
	const httpError = (status: number) =>
		Object.assign(new Error(`Request failed with status code ${status}`), {
			response: { status, headers: {}, data: {} },
		});

	it('fails on a database lookup error other than 400 or 404', async () => {
		const { execute, calls } = run(getManyDatabasePages, { database: DATA_SOURCE }, () => {
			throw httpError(401);
		});
		await expect(execute).rejects.toThrow('401');
		expect(calls.map((call) => call.options.url)).toEqual([
			`https://api.notion.com/v1/databases/${DATA_SOURCE}`,
		]);
	});

	it('uses the ID as a data source ID when the database lookup answers 404', async () => {
		const { execute, calls } = run(
			getManyDatabasePages,
			{ database: DATA_SOURCE },
			({ options }) => {
				if (options.url.includes('/databases/')) throw httpError(404);
				return { results: [], has_more: false, next_cursor: null };
			},
		);
		await execute;
		expect(calls[1]?.options.url).toBe(
			`https://api.notion.com/v1/data_sources/${DATA_SOURCE}/query`,
		);
	});

	it('asks for the remaining room on each page and stops when has_more is false', async () => {
		const { execute, calls } = run(
			getManyDatabasePages,
			{ database: DATA_SOURCE, limit: 3 },
			({ options }) => {
				if (options.url.includes('/databases/')) return { data_sources: [{ id: 'ds-1' }] };
				return options.body?.start_cursor
					? { results: [page('3')], next_cursor: 'c3', has_more: false }
					: { results: [page('1'), page('2')], next_cursor: 'c2', has_more: true };
			},
		);
		const [items = []] = (await execute) ?? [];
		expect(calls.map((call) => call.options.body?.page_size)).toEqual([undefined, 3, 1]);
		expect(items).toHaveLength(3);
	});

	it('simplifies rollups like v3, unique IDs as prefix-number, and skips people without an email', async () => {
		const properties = {
			Count: {
				id: 'a',
				type: 'rollup',
				rollup: { type: 'number', ['number']: 2, function: 'count' },
			},
			Share: {
				id: 'b',
				type: 'rollup',
				rollup: { type: 'number', ['number']: 0.25, function: 'percent_empty' },
			},
			Names: {
				id: 'c',
				type: 'rollup',
				rollup: {
					type: 'array',
					function: 'show_unique',
					array: [
						{ type: 'title', title: [{ type: 'text', plain_text: 'A' }] },
						{ type: 'title', title: [{ type: 'text', plain_text: 'A' }] },
						{ type: 'title', title: [{ type: 'text', plain_text: 'B' }] },
					],
				},
			},
			Ticket: { id: 'd', type: 'unique_id', unique_id: { prefix: 'TASK', ['number']: 42 } },
			Plain: { id: 'e', type: 'unique_id', unique_id: { prefix: null, ['number']: 7 } },
			Owners: {
				id: 'o',
				type: 'people',
				people: [
					{ object: 'user', person: { email: 'a@x.io' } },
					{ object: 'user', type: 'bot', bot: {} },
				],
			},
		};
		const result = { ...page('1'), properties: { ...page('1').properties, ...properties } };
		const { execute } = run(getManyDatabasePages, { database: DATA_SOURCE }, ({ options }) =>
			options.url.includes('/databases/')
				? { data_sources: [{ id: 'ds-1' }] }
				: { results: [result], has_more: false, next_cursor: null },
		);
		const [items = []] = (await execute) ?? [];
		const legacy = simplifyObjects([result], false, 3)[0];
		expect(items[0]?.json).toEqual({
			...legacy,
			property_ticket: 'TASK-42',
			property_plain: '7',
			property_owners: ['a@x.io'],
		});
		expect(legacy).toMatchObject({
			property_count: 2,
			property_share: 25,
			property_names: ['A', 'B'],
			property_owners: ['a@x.io', {}],
		});
	});
});

describe('httpRequest.get', () => {
	const url = 'https://api.example.com/v1/customers';
	const customers = (ids: number[]) => ids.map((id) => ({ id: `cus_${id}` }));
	const items = (result: Awaited<ReturnType<typeof runAction>>) =>
		result.ok ? result.items : result;

	it('follows a Stripe-style cursor: the id of the last item, until has_more is false', async () => {
		const fetch = mockHttp([
			{
				path: '/v1/customers',
				query: { starting_after: 'cus_2' },
				reply: { json: { data: customers([3]), has_more: false } },
			},
			{ path: '/v1/customers', reply: { json: { data: customers([1, 2]), has_more: true } } },
		]);
		const input = {
			url,
			items: '={{ $response.body.data }}',
			pages: {
				style: 'cursor',
				next: '={{ $response.body.data.at(-1)?.id }}',
				send: { query: 'starting_after' },
				more: '={{ $response.body.has_more }}',
			},
		};
		expect(items(await runAction(getRequest, { input, fetch }))).toEqual(customers([1, 2, 3]));
		expect(fetch.calls.map(({ query }) => query)).toEqual([{}, { starting_after: 'cus_2' }]);
	});

	it('sends a cursor in a header and stops when the response repeats it', async () => {
		const fetch = mockHttp([
			{ path: '/v1/customers', reply: { json: [{ id: 1 }], headers: { 'x-next': 'same' } } },
		]);
		const input = {
			url,
			pages: {
				style: 'cursor',
				next: "={{ $response.headers['x-next'] }}",
				send: { header: 'X-Cursor' },
			},
		};
		expect(items(await runAction(getRequest, { input, fetch }))).toEqual([{ id: 1 }, { id: 1 }]);
		expect(fetch.calls.map(({ headers }) => headers['x-cursor'])).toEqual([undefined, 'same']);
	});

	it('follows the Link header, or a next URL in the body, relative to the URL', async () => {
		const linked = mockHttp([
			{ path: '/v1/customers', query: { page: '2' }, reply: { json: customers([2]) } },
			{
				path: '/v1/customers',
				reply: { json: customers([1]), headers: { link: '</v1/customers?page=2>; rel="next"' } },
			},
		]);
		const fromHeader = { url, pages: { style: 'link' } };
		expect(items(await runAction(getRequest, { input: fromHeader, fetch: linked }))).toEqual(
			customers([1, 2]),
		);
		const inBody = mockHttp([
			{ path: '/v1/customers', query: { page: '2' }, reply: { json: { data: customers([2]) } } },
			{
				path: '/v1/customers',
				reply: { json: { data: customers([1]), next: '/v1/customers?page=2' } },
			},
		]);
		const fromBody = {
			url,
			items: '={{ $response.body.data }}',
			pages: { style: 'link', next: '={{ $response.body.next }}' },
		};
		expect(items(await runAction(getRequest, { input: fromBody, fetch: inBody }))).toEqual(
			customers([1, 2]),
		);
	});

	it('counts page numbers and stops at an empty page', async () => {
		const page = (ids: number[]) => ({ json: { items: customers(ids) } });
		const fetch = mockHttp([
			{ path: '/v1/customers', query: { page: '2' }, reply: page([3, 4]) },
			{ path: '/v1/customers', query: { page: '3' }, reply: page([]) },
			{ path: '/v1/customers', reply: page([1, 2]) },
		]);
		const input = {
			url,
			items: '={{ $response.body.items }}',
			pages: { style: 'offset', unit: 'page', send: { query: 'page' } },
		};
		expect(items(await runAction(getRequest, { input, fetch }))).toEqual(customers([1, 2, 3, 4]));
		expect(fetch.calls.map(({ query }) => query)).toEqual([{}, { page: '2' }, { page: '3' }]);
	});

	it('counts items as the offset and stops at a short page and at maxPages', async () => {
		const fetch = mockHttp([
			{ path: '/v1/customers', query: { offset: '2' }, reply: { json: customers([3]) } },
			{ path: '/v1/customers', reply: { json: customers([1, 2]) } },
		]);
		const input = {
			url,
			query: { limit: '2' },
			pages: { style: 'offset', unit: 'item', size: 2, send: { query: 'offset' } },
		};
		expect(items(await runAction(getRequest, { input, fetch }))).toEqual(customers([1, 2, 3]));
		const capped = { ...input, pages: { ...input.pages, maxPages: 1 } };
		expect(items(await runAction(getRequest, { input: capped, fetch }))).toEqual(customers([1, 2]));
	});

	it('fetches one page without pages, and an array body emits one item per element', async () => {
		const fetch = mockHttp([{ path: '/v1/customers', reply: { json: customers([1, 2]) } }]);
		expect(items(await runAction(getRequest, { input: { url }, fetch }))).toEqual(
			customers([1, 2]),
		);
		expect(fetch.calls).toHaveLength(1);
	});

	it('emits the full response, and a non-2xx response with neverError, as the legacy node does', async () => {
		const fetch = mockHttp([
			{
				path: '/v1/customers',
				reply: { status: 404, json: { error: 'not found' }, headers: { 'x-trace': 't1' } },
			},
		]);
		const full = await runAction(getRequest, {
			input: { url, fullResponse: true, neverError: true },
			fetch,
		});
		expect(items(full)).toEqual([
			{
				body: { error: 'not found' },
				headers: expect.objectContaining({ 'x-trace': 't1' }),
				statusCode: 404,
			},
		]);
		const bodyOnly = await runAction(getRequest, { input: { url, neverError: true }, fetch });
		expect(items(bodyOnly)).toEqual([{ error: 'not found' }]);
		const failed = await runAction(getRequest, { input: { url, fullResponse: true }, fetch });
		expect(failed.ok).toBe(false);
	});

	it('gives one full response item for a 2xx list body', async () => {
		const fetch = mockHttp([{ path: '/v1/customers', reply: { json: customers([1, 2]) } }]);
		const result = await runAction(getRequest, { input: { url, fullResponse: true }, fetch });
		expect(items(result)).toEqual([
			{ body: customers([1, 2]), headers: expect.any(Object), statusCode: 200 },
		]);
	});

	it('types the output of fullResponse and refuses it with pages', async () => {
		expect(getRequest.deriveOutput?.({ url, fullResponse: true })?.required).toEqual([
			'body',
			'headers',
			'statusCode',
		]);
		expect(getRequest.deriveOutput?.({ url })).toEqual(getRequest.output.json);
		expect(
			validate({ url, fullResponse: '={{ true }}' }, getRequest.inputSchema, {
				allowExpressions: true,
			}),
		).toEqual(['input.fullResponse: must be a plain value, not an expression']);
		const fetch = mockHttp([{ path: '/v1/customers', reply: { json: { data: [] } } }]);
		const input = { url, fullResponse: true, items: '={{ $response.body.data }}' };
		expect(await runAction(getRequest, { input, fetch })).toMatchObject({
			ok: false,
			error: { message: expect.stringContaining('fullResponse and neverError take one request') },
		});
	});

	it('names the list fields of the body when items gives no list', async () => {
		const failure = async (json: unknown) => {
			const fetch = mockHttp([{ path: '/v1/customers', reply: { json } }]);
			const input = { url, items: '={{ $response.body.data }}' };
			const result = await runAction(getRequest, { input, fetch });
			return result.ok ? undefined : result.error.message;
		};
		expect(await failure({ orders: [], meta: { links: [] }, total: 2 })).toContain(
			'input.items gives no list: ={{ $response.body.data }}; body has list fields: orders, meta.links',
		);
		expect(await failure([{ id: 1 }])).toContain('the body is a list, so omit items');
		expect(await failure({ total: 2 })).toContain('body has no list field');
	});

	it('refuses a page value that is more than a read of $response', async () => {
		const fetch = mockHttp([{ path: '/v1/customers', reply: { json: { next: 'c2' } } }]);
		const input = {
			url,
			pages: {
				style: 'cursor',
				next: '={{ $response.body.next || $json.id }}',
				send: { query: 'cursor' },
			},
		};
		expect(await runAction(getRequest, { input, fetch })).toMatchObject({
			ok: false,
			error: { message: expect.stringContaining('A page value reads fields of $response') },
		});
	});

	it('types each item by the declared schema of the body, closed unless it allows more', () => {
		const issue = { type: 'object', properties: { title: { type: 'string' } } };
		const closedIssue = { ...issue, additionalProperties: false };
		const body = { type: 'object', properties: { issues: { type: 'array', items: issue } } };
		expect(getRequest.deriveOutput?.({ url, schema: body })).toEqual({
			type: 'object',
			properties: { issues: { type: 'array', items: closedIssue } },
			additionalProperties: false,
		});
		expect(getRequest.deriveOutput?.({ url, schema: { type: 'array', items: issue } })).toEqual(
			closedIssue,
		);
		expect(
			getRequest.deriveOutput?.({ url, schema: { type: 'array', items: { type: 'string' } } }),
		).toEqual({
			type: 'object',
			properties: { data: { type: 'string' } },
			required: ['data'],
			additionalProperties: false,
		});
		expect(
			getRequest.deriveOutput?.({ url, schema: body, items: '={{ $response.body.issues }}' }),
		).toEqual(closedIssue);
		expect(
			getRequest.deriveOutput?.({ url, schema: body, items: '={{ $response.body.issues[0] }}' }),
		).toEqual(getRequest.output.json);
		expect(getRequest.deriveOutput?.({ url, schema: body, fullResponse: true })).toMatchObject({
			properties: { body: { properties: { issues: { items: closedIssue } } } },
			required: ['body', 'headers', 'statusCode'],
		});
		const open = {
			type: 'object',
			properties: { id: { type: 'number' } },
			additionalProperties: true,
		};
		expect(getRequest.deriveOutput?.({ url, schema: open })).toEqual(open);
		expect(sendRequest.deriveOutput?.({ method: 'POST', url, schema: issue })).toEqual(closedIssue);
		expect(validate({ url, schema: body }, getRequest.inputSchema)).toEqual([]);
		for (const action of [getRequest, sendRequest]) {
			expect(action.inputSchema.properties?.schema?.['x-n8n-declared']).toBe(true);
			expect(action.inputSchema.properties?.schema?.['x-n8n-hint']).toBe(
				'Body JSON Schema from the API docs, not a sample. Types items; objects closed',
			);
		}
		expect(
			validate({ url, schema: '={{ {} }}' }, getRequest.inputSchema, { allowExpressions: true }),
		).toEqual(['input.schema: must be a plain value, not an expression']);
	});

	it('migrates v2 cursor pagination to a cursor page style', () => {
		const v2 = {
			url,
			pagination: { cursorPath: 'meta.next-page', queryParameter: 'cursor', maxPages: 5 },
		};
		const migrated = getRequest.migrate?.(2, v2);
		expect(migrated).toEqual({
			url,
			pages: {
				style: 'cursor',
				next: '={{ $response.body.meta["next-page"] }}',
				send: { query: 'cursor' },
				maxPages: 5,
			},
		});
		expect(validate(migrated, getRequest.inputSchema)).toEqual([]);
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

	it('emits the status code of a failed request with fullResponse and neverError', async () => {
		const fetch = mockHttp([
			{ method: 'POST', path: '/done', reply: { status: 409, json: { error: 'exists' } } },
		]);
		const input = {
			method: 'POST',
			url: 'https://reports.test/done',
			fullResponse: true,
			neverError: true,
		};
		const result = await runAction(sendRequest, { input, fetch });
		expect(result.ok ? result.items : result).toEqual([
			{ body: { error: 'exists' }, headers: expect.any(Object), statusCode: 409 },
		]);
	});
});
