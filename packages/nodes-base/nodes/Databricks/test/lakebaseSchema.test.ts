import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import {
	fetchLakebaseColumns,
	fetchLakebaseFunctionArguments,
	fetchLakebaseFunctions,
} from '../actions/lakebase/schema';

const SCHEMA_URL = 'https://host.example/api/2.0/workspace/7/rest/app/public';

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const documentWith = (properties: object, required: string[] = []) => ({
	components: { schemas: { orders: { required, properties } } },
});

const rpcDocumentWith = (
	fn: string,
	properties: object,
	required: string[] = [],
	mediaType = 'application/json; charset=utf-8',
) => ({
	paths: {
		[`/rpc/${fn}`]: {
			post: { requestBody: { content: { [mediaType]: { schema: { properties, required } } } } },
		},
	},
});

describe('Lakebase -> schema', () => {
	const setup = (document: unknown) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getExecutionCancelSignal.mockReturnValue(undefined);
		context.getNodeParameter.mockImplementation((name) =>
			name === 'authentication' ? 'oAuth2' : undefined,
		);
		context.helpers.httpRequestWithAuthentication.mockResolvedValue(document);
		return context;
	};

	it('reads the document for the named table', async () => {
		const context = setup(documentWith({ sku: { type: 'string' } }));

		const columns = await fetchLakebaseColumns(context, SCHEMA_URL, 'orders');

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'databricksOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				url: `${SCHEMA_URL}/openapi.json`,
				// The table picker in #40407 negotiates the same way on this endpoint
				headers: expect.objectContaining({
					Accept: 'application/openapi+json, application/json',
				}),
			}),
			expect.anything(),
		);
		expect(columns).toEqual([
			expect.objectContaining({ name: 'sku', type: 'string', isPrimaryKey: false }),
		]);
	});

	it.each([
		['a plain column', { type: 'string' }, [], { hasDefault: false, isRequired: false }],
		['a NOT NULL column', { type: 'text' }, ['sku'], { isRequired: true, hasDefault: false }],
		['a column with a default', { type: 'integer', default: 0 }, [], { hasDefault: true }],
		[
			'a NOT NULL column that the database defaults',
			{ type: 'integer', default: "nextval('seq')" },
			['sku'],
			{ isRequired: true, hasDefault: true },
		],
		['a read-only column', { type: 'string', readOnly: true }, [], { isReadOnly: true }],
		['a primary key', { type: 'integer', description: 'Note <pk/>' }, [], { isPrimaryKey: true }],
		['an enum column', { type: 'string', enum: ['a', 'b'] }, [], { enum: ['a', 'b'] }],
		[
			'a formatted column',
			{ type: 'string', format: 'timestamp with time zone' },
			[],
			{ format: 'timestamp with time zone' },
		],
	])('reports %s', async (_name, property, required, expected) => {
		const context = setup(documentWith({ sku: property }, required));

		const [column] = await fetchLakebaseColumns(context, SCHEMA_URL, 'orders');

		expect(column).toEqual(expect.objectContaining({ name: 'sku', ...expected }));
	});

	it.each([
		['the table is absent', { components: { schemas: {} } }],
		['there are no schemas', { components: {} }],
		['the document is empty', {}],
		['the response is not an object', 'nope'],
	])('returns no columns when %s', async (_name, document) => {
		const context = setup(document);

		expect(await fetchLakebaseColumns(context, SCHEMA_URL, 'orders')).toEqual([]);
	});
});

describe('Lakebase -> function schema', () => {
	const setup = (document: unknown) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getExecutionCancelSignal.mockReturnValue(undefined);
		context.getNodeParameter.mockImplementation((name) =>
			name === 'authentication' ? 'oAuth2' : undefined,
		);
		context.helpers.httpRequestWithAuthentication.mockResolvedValue(document);
		return context;
	};

	describe('fetchLakebaseFunctions', () => {
		it('lists the rpc paths and skips the table paths', async () => {
			const context = setup({
				paths: { '/': {}, '/orders': {}, '/rpc/spike_add': {}, '/rpc/databricks_auth': {} },
			});

			expect(await fetchLakebaseFunctions(context, SCHEMA_URL)).toEqual([
				'spike_add',
				'databricks_auth',
			]);
		});

		it.each([
			['the document has no paths', {}],
			['paths is not an object', { paths: 'x' }],
			['the response is not an object', 'nope'],
		])('returns no functions when %s', async (_name, document) => {
			expect(await fetchLakebaseFunctions(setup(document), SCHEMA_URL)).toEqual([]);
		});
	});

	describe('fetchLakebaseFunctionArguments', () => {
		it('reads the named arguments from the request body schema', async () => {
			const context = setup(
				rpcDocumentWith(
					'spike_add',
					{ a: { type: 'integer', format: 'integer' }, b: { type: 'integer' } },
					['a', 'b'],
				),
			);

			const args = await fetchLakebaseFunctionArguments(context, SCHEMA_URL, 'spike_add');

			expect(args).toEqual([
				expect.objectContaining({
					name: 'a',
					type: 'integer',
					format: 'integer',
					isRequired: true,
				}),
				expect.objectContaining({ name: 'b', type: 'integer', isRequired: true }),
			]);
		});

		it('marks an argument absent from required as optional', async () => {
			const context = setup(rpcDocumentWith('spike_add', { a: { type: 'integer' } }, []));

			const [arg] = await fetchLakebaseFunctionArguments(context, SCHEMA_URL, 'spike_add');

			expect(arg.isRequired).toBe(false);
		});

		it('picks the content entry whatever its media type key is', async () => {
			const context = setup(
				rpcDocumentWith('spike_add', { a: { type: 'integer' } }, ['a'], 'application/json'),
			);

			const args = await fetchLakebaseFunctionArguments(context, SCHEMA_URL, 'spike_add');

			expect(args).toEqual([expect.objectContaining({ name: 'a', isRequired: true })]);
		});

		it.each([
			['the function is absent', rpcDocumentWith('other', { a: { type: 'integer' } })],
			['post has no request body', { paths: { '/rpc/spike_add': { post: {} } } }],
			[
				'content is empty',
				{ paths: { '/rpc/spike_add': { post: { requestBody: { content: {} } } } } },
			],
			[
				'properties is missing',
				{
					paths: {
						'/rpc/spike_add': {
							post: { requestBody: { content: { 'application/json': { schema: {} } } } },
						},
					},
				},
			],
		])('returns no arguments when %s', async (_name, document) => {
			expect(
				await fetchLakebaseFunctionArguments(setup(document), SCHEMA_URL, 'spike_add'),
			).toEqual([]);
		});
	});
});
