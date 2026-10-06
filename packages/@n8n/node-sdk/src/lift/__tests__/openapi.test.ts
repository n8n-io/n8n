import { readFileSync } from 'node:fs';
import path from 'node:path';

import { isRecord } from '../../index';
import { freezeHttpGuest } from '../../freeze';
import { mockHttp, runAction } from '../../testing';
import { liftHttpGuest, parseHttpGuestConfig, valueAt } from '../http';
import { mapOpenApi, type OpenApiMapping } from '../openapi';

const SEARCHLY = path.resolve(
	__dirname,
	'../../../evaluations/node-building/docs/searchly.openapi.json',
);

/** The document with each local `$ref` replaced by its target, as the import endpoint gives it. */
function dereferenced(value: unknown, root: unknown = value): unknown {
	if (Array.isArray(value)) return value.map((item) => dereferenced(item, root));
	if (!isRecord(value)) return value;
	if (typeof value.$ref === 'string') return dereferenced(valueAt(root, value.$ref.slice(1)), root);
	return Object.fromEntries(
		Object.entries(value).map(([key, item]) => [key, dereferenced(item, root)]),
	);
}

/** Each config is valid, freezes, and lifts with the contract it holds. */
async function expectValid({ actions }: OpenApiMapping) {
	for (const config of actions) {
		expect(parseHttpGuestConfig(config)).toBe(config);
		await expect(freezeHttpGuest(config)).resolves.toMatchObject({
			manifest: { id: config.contract.id },
		});
		expect(liftHttpGuest(config).id).toBe(config.contract.id);
	}
}

const acme = (paths: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
	openapi: '3.1.0',
	info: { title: 'Acme API', version: '1.0.0' },
	servers: [
		{ url: 'https://{region}.acme.example.com/v1', variables: { region: { default: 'eu' } } },
	],
	components: {
		securitySchemes: {
			bearer: { type: 'http', scheme: 'bearer' },
			oidc: { type: 'openIdConnect', openIdConnectUrl: 'https://acme.example.com/.well-known' },
			cookieKey: { type: 'apiKey', in: 'cookie', name: 'session' },
		},
	},
	security: [{ bearer: [] }],
	paths,
	...extra,
});

const json = (schema: unknown) => ({ content: { 'application/json': { schema } } });
const ok = (schema: unknown = { type: 'object' }) => ({ responses: { '200': json(schema) } });
const item = { type: 'object', properties: { id: { type: 'string' } } };
const itemId = { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } };

describe('mapOpenApi on searchly', () => {
	const mapping = mapOpenApi(dereferenced(JSON.parse(readFileSync(SEARCHLY, 'utf8'))));

	it('maps the node, the query key credential and a paged list', async () => {
		expect(mapping.node).toEqual({
			id: 'searchly',
			displayName: 'Searchly',
			baseUrl: 'http://127.0.0.1:18090/searchly/v2',
			resources: {},
		});
		expect(mapping.credential).toEqual({
			kind: 'query',
			key: 'api_key',
			name: 'customSearchlyApi',
		});
		expect(mapping.skipped).toEqual([]);
		expect(mapping.actions).toHaveLength(1);
		const [search] = mapping.actions;
		expect(search?.contract).toMatchObject({
			id: 'searchly.search',
			node: 'searchly',
			credentials: ['customSearchlyApi'],
			flow: { effect: 'write', cardinality: '1:N' },
			egress: { hosts: ['127.0.0.1'] },
			input: { required: ['index', 'query'] },
		});
		expect(search?.list).toMatchObject({
			method: 'POST',
			path: '/search',
			query: { index: { input: 'index' } },
			body: { query: { input: 'query' }, filters: { input: 'filters' } },
			items: '/hits',
			pages: {
				style: 'offset',
				unit: 'item',
				send: { query: 'offset' },
				size: { query: 'limit', max: 10 },
			},
		});
		await expectValid(mapping);
	});

	it('pages the frozen action with offset and limit', async () => {
		const [search] = mapping.actions;
		if (!search) throw new Error('searchly has no action');
		const { bundle } = await freezeHttpGuest(search);
		const action = liftHttpGuest(parseHttpGuestConfig(JSON.parse(bundle)));
		const hit = (id: string) => ({ id, title: id, lang: 'en', score: 1 });
		const fetch = mockHttp([
			{
				method: 'POST',
				path: '/searchly/v2/search',
				times: 1,
				reply: {
					json: {
						hits: Array.from({ length: 10 }, (_, at) => hit(`h${at}`)),
						total: 11,
						offset: 0,
						limit: 10,
					},
				},
			},
			{
				method: 'POST',
				path: '/searchly/v2/search',
				reply: { json: { hits: [hit('h10')], total: 11, offset: 10, limit: 10 } },
			},
		]);
		const result = await runAction(action, {
			input: { index: 'docs', query: 'n8n', paging: { mode: 'all' } },
			fetch,
			credential: { type: 'customSearchlyApi', data: {} },
			credentials: [{ name: 'customSearchlyApi', displayName: 'Searchly', properties: [] }],
		});
		expect(result.ok && result.items).toHaveLength(11);
		expect(fetch.calls.map(({ url, body }) => ({ url, body }))).toEqual([
			{
				url: 'http://127.0.0.1:18090/searchly/v2/search?index=docs&limit=10',
				body: { query: 'n8n' },
			},
			{
				url: 'http://127.0.0.1:18090/searchly/v2/search?index=docs&limit=10&offset=10',
				body: { query: 'n8n' },
			},
		]);
	});
});

describe('mapOpenApi coverage', () => {
	const mapping = mapOpenApi(
		acme({
			'/items/{itemId}': {
				parameters: [itemId],
				get: {
					tags: ['Item'],
					operationId: 'getItem',
					summary: 'Get an item',
					parameters: [
						{ name: 'X-Version', in: 'header', schema: { type: 'string', default: '2' } },
						{ name: 'X-Trace', in: 'header', schema: { type: 'string' } },
						{ name: 'theme', in: 'cookie', schema: { type: 'string' } },
					],
					...ok(item),
				},
				patch: {
					tags: ['Item'],
					operationId: 'updateItem',
					requestBody: {
						required: true,
						...json({
							type: 'object',
							required: ['name'],
							properties: { name: { type: 'string' } },
						}),
					},
					...ok(item),
				},
				delete: {
					tags: ['Item'],
					parameters: [
						{ name: 'X-Confirm', in: 'header', required: true, schema: { type: 'string' } },
					],
					...ok(),
				},
				options: { tags: ['Item'], ...ok() },
			},
			'/items/{itemId}/notes': {
				parameters: [itemId],
				get: {
					tags: ['Item'],
					parameters: [
						{ name: 'session', in: 'cookie', required: true, schema: { type: 'string' } },
					],
					...ok(),
				},
				post: {
					tags: ['Item'],
					requestBody: { content: { 'multipart/form-data': { schema: { type: 'object' } } } },
					...ok(),
				},
				put: { tags: ['Item'], requestBody: json({ type: 'array', items: item }), ...ok() },
			},
			'/echo': { post: { requestBody: json({ type: 'string' }), ...ok() } },
			'/secret': { get: { security: [{ oidc: [] }], ...ok() } },
			'/session': { get: { security: [{ cookieKey: [] }], ...ok() } },
			'/both': { get: { security: [{ bearer: [], cookieKey: [] }], ...ok() } },
			'/health': { get: { security: [], ...ok() } },
			'/items': {
				get: {
					operationId: 'list_items',
					parameters: [{ name: 'per_page', in: 'query', schema: { type: 'integer', maximum: 50 } }],
					responses: {
						'200': {
							headers: { Link: { schema: { type: 'string' } } },
							...json({ type: 'array', items: item }),
						},
					},
				},
			},
			'/users': {
				get: {
					tags: ['User'],
					operationId: 'get',
					parameters: [
						{ name: 'starting_after', in: 'query', schema: { type: 'string' } },
						{ name: 'limit', in: 'query', schema: { type: 'integer' } },
						{ name: 'role', in: 'query', schema: { type: 'string' } },
					],
					...ok({
						type: 'object',
						properties: { data: { type: 'array', items: item }, next_cursor: { type: 'string' } },
					}),
				},
			},
			'/user': { get: { operationId: 'user_get', ...ok(item) } },
			'/pages': {
				get: {
					tags: ['Page'],
					operationId: 'listPages',
					parameters: [
						{ name: 'page', in: 'query', schema: { type: 'integer', default: 0 } },
						{ name: 'page_size', in: 'query', schema: { type: 'integer' } },
					],
					...ok({
						type: 'object',
						properties: { pages: { type: 'array', items: item }, total: { type: 'integer' } },
					}),
				},
			},
		}),
	);
	const action = (id: string) => mapping.actions.find(({ contract }) => contract.id === id);

	it('lists each operation that a config cannot express, with the reason', () => {
		expect(mapping.skipped).toEqual([
			{
				operation: 'DELETE /items/{itemId}',
				reason: 'the header X-Confirm needs a value from the user',
			},
			{ operation: 'OPTIONS /items/{itemId}', reason: 'the HTTP guest does not send OPTIONS' },
			{
				operation: 'GET /items/{itemId}/notes',
				reason: 'the cookie parameter session is not supported',
			},
			{
				operation: 'POST /items/{itemId}/notes',
				reason: 'the body is multipart/form-data, not JSON',
			},
			{
				operation: 'PUT /items/{itemId}/notes',
				reason: 'the JSON body is a top-level array, not an object',
			},
			{
				operation: 'POST /echo',
				reason: 'the JSON body is a top-level string, not an object',
			},
			{
				operation: 'GET /secret',
				reason: 'the security scheme oidc (openIdConnect) is not supported',
			},
			{
				operation: 'GET /session',
				reason: 'the security scheme cookieKey (apiKey cookie) is not supported',
			},
			{
				operation: 'GET /both',
				reason: 'it needs the security schemes bearer and cookieKey together',
			},
		]);
		expect(mapping.credential).toEqual({ kind: 'bearer', name: 'customAcmeApi' });
	});

	it('maps ids, resources and the fields every action of a resource shares', async () => {
		expect(mapping.node).toEqual({
			id: 'acme',
			displayName: 'Acme',
			baseUrl: 'https://eu.acme.example.com/v1',
			resources: { item: ['itemId'], user: [], page: [] },
		});
		expect(mapping.actions.map(({ contract }) => contract.id)).toEqual([
			'acme.item.getItem',
			'acme.item.updateItem',
			'acme.getHealth',
			'acme.listItems',
			'acme.user.get',
			'acme.userGet2',
			'acme.page.listPages',
		]);
		expect(mapping.actions.map(({ resourceFields }) => resourceFields)).toEqual([
			['itemId'],
			['itemId'],
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		]);
		await expectValid(mapping);
	});

	it('sends a fixed header, path and body inputs, and drops an optional header or cookie with no value', () => {
		expect(action('acme.item.getItem')).toMatchObject({
			contract: {
				action: 'Get an item',
				summary: 'Get an item.',
				credentials: ['customAcmeApi'],
				flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
				input: { required: ['itemId'] },
			},
			request: { method: 'GET', path: '/items/{itemId}', headers: { 'X-Version': '2' } },
		});
		expect(action('acme.item.updateItem')).toMatchObject({
			contract: { input: { required: ['itemId', 'name'] } },
			request: { method: 'PATCH', body: { name: { input: 'name' } } },
		});
		expect(action('acme.getHealth')?.contract.credentials).toEqual([]);
	});

	it('proposes link, cursor and page paging, and keeps other query parameters as inputs', () => {
		expect(action('acme.listItems')?.list).toMatchObject({
			items: '',
			pages: { style: 'link', size: { query: 'per_page', max: 50 } },
		});
		expect(action('acme.user.get')?.list).toEqual(
			expect.objectContaining({
				query: { role: { input: 'role' } },
				items: '/data',
				pages: {
					style: 'cursor',
					next: '/next_cursor',
					send: { query: 'starting_after' },
					size: { query: 'limit', max: 100 },
				},
			}),
		);
		expect(action('acme.page.listPages')?.list?.pages).toEqual({
			style: 'offset',
			unit: 'page',
			start: 0,
			send: { query: 'page' },
			size: { query: 'page_size', max: 100 },
		});
	});
});

describe('mapOpenApi credentials', () => {
	const withScheme = (scheme: unknown) =>
		acme(
			{ '/ping': { get: ok() } },
			{ components: { securitySchemes: { auth: scheme } }, security: [{ auth: [] }] },
		);

	it.each([
		[
			{ type: 'apiKey', in: 'header', name: 'X-Api-Key' },
			{ kind: 'header', key: 'X-Api-Key' },
		],
		[{ type: 'http', scheme: 'Basic' }, { kind: 'basic' }],
		[
			{
				type: 'oauth2',
				flows: {
					authorizationCode: {
						authorizationUrl: 'https://acme.example.com/authorize',
						tokenUrl: 'https://acme.example.com/token',
						scopes: { read: 'Read', write: 'Write' },
					},
				},
			},
			{
				kind: 'oauth2AuthorizationCode',
				authorizationEndpoint: 'https://acme.example.com/authorize',
				tokenEndpoint: 'https://acme.example.com/token',
				scope: ['read', 'write'],
			},
		],
		[
			{
				type: 'oauth2',
				flows: { clientCredentials: { tokenUrl: 'https://acme.example.com/token', scopes: {} } },
			},
			{
				kind: 'oauth2ClientCredentials',
				tokenEndpoint: 'https://acme.example.com/token',
				scope: [],
			},
		],
	])('proposes %j', async (scheme, credential) => {
		const mapping = mapOpenApi(withScheme(scheme));
		expect(mapping.credential).toEqual({ ...credential, name: 'customAcmeApi' });
		expect(mapping.actions[0]?.contract.credentials).toEqual(['customAcmeApi']);
		await expectValid(mapping);
	});

	it.each([
		[
			{
				type: 'oauth2',
				flows: { implicit: { authorizationUrl: 'https://a.example.com', scopes: {} } },
			},
			'oauth2 implicit',
		],
		[
			{ type: 'oauth2', flows: { password: { tokenUrl: 'https://a.example.com', scopes: {} } } },
			'oauth2 password',
		],
		[{ type: 'mutualTLS' }, 'mutualTLS'],
		[{ type: 'http', scheme: 'digest' }, 'http digest'],
	])('skips the operations of %j', (scheme, what) => {
		const mapping = mapOpenApi(withScheme(scheme));
		expect(mapping.credential).toBeUndefined();
		expect(mapping.skipped).toEqual([
			{ operation: 'GET /ping', reason: `the security scheme auth (${what}) is not supported` },
		]);
	});
});

describe('mapOpenApi documents', () => {
	it('refuses Swagger 2 with a hint to convert it, and a document that is not OpenAPI 3', () => {
		expect(() => mapOpenApi({ swagger: '2.0', info: { title: 'Old' }, paths: {} })).toThrow(
			'Convert the document to OpenAPI 3 first',
		);
		expect(() => mapOpenApi({ info: { title: 'None' } })).toThrow('is not OpenAPI 3.0 or 3.1');
		expect(() => mapOpenApi({ ...acme({}), servers: [{ url: '/v1' }] })).toThrow(
			'absolute http or https URL',
		);
	});

	it('cuts a cyclic schema, so the config freezes', async () => {
		const tree: Record<string, unknown> = {
			type: 'object',
			properties: { name: { type: 'string' } },
		};
		const children = { type: 'array', items: tree };
		tree.properties = { name: { type: 'string' }, children };
		const mapping = mapOpenApi(acme({ '/tree': { get: { operationId: 'getTree', ...ok(tree) } } }));
		const [config] = mapping.actions;
		const level = '/properties/children/items';
		expect(valueAt(config?.contract.output, `${level.repeat(2)}/properties/children/type`)).toBe(
			'array',
		);
		expect(valueAt(config?.contract.output, level.repeat(3))).toEqual({});
		await expectValid(mapping);
	});
});
