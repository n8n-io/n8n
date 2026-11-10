import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { JSONSchema7Definition, JSONSchema7 } from 'json-schema';
import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import {
	buildPromptArguments,
	convertJsonSchemaToResourceMapperFields,
	getAllPrompts,
	getAllResourceTemplates,
	getAllResources,
	jsonSchemaTypeToDefaultValue,
	jsonSchemaTypeToFieldType,
	mapCapabilityError,
	MCP_LIST_DEADLINE_MS,
	MCP_MAX_LIST_PAGES,
} from '../utils';

describe('utils', () => {
	describe('jsonSchemaTypeToFieldType', () => {
		it.each([
			[{ schema: { type: 'string', format: 'date-time' } as JSONSchema7, expected: 'dateTime' }],
			[{ schema: { type: 'string' } as JSONSchema7, expected: 'string' }],
			[{ schema: { type: 'number' } as JSONSchema7, expected: 'number' }],
			[{ schema: { type: 'integer' } as JSONSchema7, expected: 'number' }],
			[{ schema: { type: 'boolean' } as JSONSchema7, expected: 'boolean' }],
			[{ schema: { type: 'array' } as JSONSchema7, expected: 'array' }],
			[{ schema: { type: 'object' } as JSONSchema7, expected: 'object' }],
		])('should return the correct field type for the schema', ({ schema, expected }) => {
			expect(jsonSchemaTypeToFieldType(schema)).toEqual(expected);
		});
	});

	describe('jsonSchemaTypeToDefaultValue', () => {
		it.each([
			[{ schema: false as JSONSchema7Definition, expected: null }],
			[{ schema: true as JSONSchema7Definition, expected: 'any' }],
			[{ schema: { type: 'string' } as JSONSchema7Definition, expected: 'string' }],
			[{ schema: { type: 'number' } as JSONSchema7Definition, expected: 0 }],
			[{ schema: { type: 'integer' } as JSONSchema7Definition, expected: 0 }],
			[{ schema: { type: 'number', minimum: -1 } as JSONSchema7Definition, expected: -1 }],
			[{ schema: { type: 'number', maximum: 1 } as JSONSchema7Definition, expected: 1 }],
			[{ schema: { type: 'boolean' } as JSONSchema7Definition, expected: false }],
			[
				{
					schema: { type: 'string', format: 'date-time' } as JSONSchema7Definition,
					expected: '2025-01-01T00:00:00Z',
				},
			],
			[
				{
					schema: { type: 'string', format: 'uri' } as JSONSchema7Definition,
					expected: 'https://example.com',
				},
			],
			[
				{
					schema: { type: 'string', format: 'url' } as JSONSchema7Definition,
					expected: 'https://example.com',
				},
			],
			[
				{
					schema: { type: 'string', format: 'date' } as JSONSchema7Definition,
					expected: '2025-01-01',
				},
			],
			[
				{
					schema: { type: 'string', format: 'time' } as JSONSchema7Definition,
					expected: '00:00:00',
				},
			],
			[{ schema: { type: 'array' } as JSONSchema7Definition, expected: [] }],
			[
				{
					schema: { type: 'array', items: { type: 'string' } } as JSONSchema7Definition,
					expected: ['string'],
				},
			],
			[
				{
					schema: {
						type: 'array',
						items: [{ type: 'number' }, { type: 'string' }],
					} as JSONSchema7Definition,
					expected: [0, 'string'],
				},
			],
			[
				{
					schema: {
						type: 'object',
						properties: {
							name: { type: 'string' },
							age: { type: 'number' },
						},
						required: ['name', 'age'],
						additionalProperties: false,
					} as JSONSchema7Definition,
					expected: { name: 'string', age: 0 },
				},
			],
			[
				{
					schema: {
						type: 'object',
						properties: {
							name: { type: 'string' },
							age: { type: 'number' },
						},
						required: ['name', 'age'],
						additionalProperties: { type: 'string' },
					} as JSONSchema7Definition,
					expected: { name: 'string', age: 0, '<additionalProperty>': 'string' },
				},
			],
			[
				{
					schema: {
						type: 'string',
						enum: ['foo', 'bar'],
					} as JSONSchema7Definition,
					expected: 'foo',
				},
			],
			[
				{
					schema: {
						oneOf: [{ type: 'string' }, { type: 'number' }],
					} as JSONSchema7Definition,
					expected: 'string',
				},
			],
			[
				{
					schema: {
						anyOf: [{ type: 'string' }, { type: 'number' }],
					} as JSONSchema7Definition,
					expected: 'string',
				},
			],
			[
				{
					schema: {
						allOf: [
							{
								type: 'object',
								properties: {
									age: { type: 'number' },
								},
								required: ['age'],
								additionalProperties: false,
							},
							{
								type: 'object',
								properties: {
									name: { type: 'string' },
								},
								required: ['name'],
								additionalProperties: false,
							},
						],
					} as JSONSchema7Definition,
					expected: { age: 0, name: 'string' },
				},
			],
		])('should return the correct default value for the schema', ({ schema, expected }) => {
			expect(jsonSchemaTypeToDefaultValue(schema)).toEqual(expected);
		});
	});

	describe('convertJsonSchemaToResourceMapperFields', () => {
		it.each([
			[
				{
					schema: { type: 'string' } as JSONSchema7,
					expected: [],
				},
			],
			[
				{
					schema: { type: 'object' } as JSONSchema7,
					expected: [],
				},
			],
			[
				{
					schema: {
						type: 'object',
						properties: { name: { type: 'string' }, age: { type: 'number' } },
						required: ['name'],
					} as JSONSchema7,
					expected: [
						{
							id: 'name',
							displayName: 'name',
							defaultMatch: false,
							required: true,
							display: true,
							type: 'string',
						},
						{
							id: 'age',
							displayName: 'age',
							defaultMatch: false,
							required: false,
							display: true,
							type: 'number',
						},
					],
				},
			],
			[
				{
					schema: { type: 'object', properties: { name: true, age: false } } as JSONSchema7,
					expected: [
						{
							id: 'name',
							displayName: 'name',
							defaultMatch: false,
							required: false,
							display: true,
							type: 'string',
						},
					],
				},
			],
		])(
			'should return the correct resource mapper fields for the schema',
			({ schema, expected }) => {
				expect(convertJsonSchemaToResourceMapperFields(schema)).toEqual(expected);
			},
		);

		it.each([
			[
				{
					schema: {
						type: 'object',
						properties: { names: { type: 'array', items: { type: 'string' } } },
						required: ['names'],
					} as JSONSchema7,
					expected: [
						{
							id: 'names',
							displayName: 'names',
							defaultMatch: false,
							required: true,
							display: true,
							type: 'array',
							defaultValue: JSON.stringify(['string'], null, 2),
						},
					],
				},
			],
			[
				{
					schema: {
						type: 'object',
						properties: {
							user: {
								type: 'object',
								properties: { name: { type: 'string' }, age: { type: 'number' } },
							},
						},
						required: ['user'],
					} as JSONSchema7,
					expected: [
						{
							id: 'user',
							displayName: 'user',
							defaultMatch: false,
							required: true,
							display: true,
							type: 'object',
							defaultValue: JSON.stringify({ name: 'string', age: 0 }, null, 2),
						},
					],
				},
			],
		])('should add defaultValue for arrays and objects', ({ schema, expected }) => {
			expect(convertJsonSchemaToResourceMapperFields(schema)).toEqual(expected);
		});

		it('should add options for enums', () => {
			const schema = {
				type: 'object',
				properties: { color: { type: 'string', enum: ['red', 'green', 'blue'] } },
			} as JSONSchema7;
			const expected = [
				{
					id: 'color',
					displayName: 'color',
					defaultMatch: false,
					required: false,
					display: true,
					type: 'options',
					options: [
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						{ name: 'red', value: 'red' },
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						{ name: 'green', value: 'green' },
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						{ name: 'blue', value: 'blue' },
					],
				},
			];
			expect(convertJsonSchemaToResourceMapperFields(schema)).toEqual(expected);
		});
	});

	describe('MCP_MAX_LIST_PAGES', () => {
		it('caps pagination at 100 pages', () => {
			expect(MCP_MAX_LIST_PAGES).toBe(100);
		});
	});

	describe('getAllResources', () => {
		const node = mockDeep<INode>();

		it('aggregates resources across pages and passes the cursor and options', async () => {
			const client = mockDeep<Client>();
			const options = { timeout: 1234 };
			client.listResources
				.mockResolvedValueOnce({
					resources: [{ uri: 'mem://a', name: 'a' }],
					nextCursor: 'c1',
				})
				.mockResolvedValueOnce({
					resources: [{ uri: 'mem://b', name: 'b' }],
				});

			const result = await getAllResources(client, options, node, 0);

			expect(result).toEqual({
				items: [
					{ uri: 'mem://a', name: 'a' },
					{ uri: 'mem://b', name: 'b' },
				],
				truncated: false,
			});
			expect(client.listResources).toHaveBeenNthCalledWith(1, { cursor: undefined }, options);
			expect(client.listResources).toHaveBeenNthCalledWith(2, { cursor: 'c1' }, options);
		});

		it('returns a truncated result at the page cap instead of throwing', async () => {
			const client = mockDeep<Client>();
			client.listResources.mockImplementation(async (params) => {
				const page = params?.cursor === undefined ? 0 : Number(params.cursor);
				return { resources: [], nextCursor: String(page + 1) };
			});

			const result = await getAllResources(client, {}, node, 0);

			expect(result).toEqual({ items: [], truncated: true });
			expect(client.listResources).toHaveBeenCalledTimes(MCP_MAX_LIST_PAGES);
		});

		it('returns a truncated result on a repeated cursor', async () => {
			const client = mockDeep<Client>();
			client.listResources.mockResolvedValue({ resources: [], nextCursor: 'c' });

			const result = await getAllResources(client, {}, node, 0);

			expect(result).toEqual({ items: [], truncated: true });
			expect(client.listResources).toHaveBeenCalledTimes(2);
		});

		it('stops and truncates before appending a page fetched with a repeated cursor', async () => {
			const client = mockDeep<Client>();
			client.listResources
				.mockResolvedValueOnce({
					resources: [{ uri: 'mem://a', name: 'a' }],
					nextCursor: 'c1',
				})
				.mockResolvedValueOnce({
					resources: [{ uri: 'mem://b', name: 'b' }],
					nextCursor: 'c2',
				})
				.mockResolvedValueOnce({
					resources: [{ uri: 'mem://c', name: 'c' }],
					nextCursor: 'c1',
				});

			const result = await getAllResources(client, {}, node, 0);

			expect(result.truncated).toBe(true);
			expect(result.items.map((resource) => resource.name)).toEqual(['a', 'b']);
			expect(client.listResources).toHaveBeenCalledTimes(3);
		});

		it('returns a truncated result when the overall deadline passes', async () => {
			const client = mockDeep<Client>();
			const now = vi.spyOn(Date, 'now');
			let clock = 0;
			now.mockImplementation(() => clock);
			client.listResources.mockImplementation(async () => {
				clock += MCP_LIST_DEADLINE_MS + 1;
				return {
					resources: [{ uri: 'mem://a', name: 'a' }],
					nextCursor: 'c1',
				};
			});

			try {
				const result = await getAllResources(client, {}, node, 0);

				expect(result).toEqual({ items: [{ uri: 'mem://a', name: 'a' }], truncated: true });
				expect(client.listResources).toHaveBeenCalledTimes(1);
			} finally {
				now.mockRestore();
			}
		});

		it('throws a NodeOperationError before calling the server when the signal is already aborted', async () => {
			const client = mockDeep<Client>();
			const controller = new AbortController();
			controller.abort();

			const promise = getAllResources(client, { signal: controller.signal }, node, 0);

			await expect(promise).rejects.toBeInstanceOf(NodeOperationError);
			await expect(promise).rejects.toThrow('Execution was cancelled');
			expect(client.listResources).not.toHaveBeenCalled();
		});
	});

	describe('getAllResourceTemplates', () => {
		const node = mockDeep<INode>();

		it('aggregates resource templates across pages', async () => {
			const client = mockDeep<Client>();
			client.listResourceTemplates
				.mockResolvedValueOnce({
					resourceTemplates: [{ uriTemplate: 'mem://a/{id}', name: 'a' }],
					nextCursor: 'c1',
				})
				.mockResolvedValueOnce({
					resourceTemplates: [{ uriTemplate: 'mem://b/{id}', name: 'b' }],
				});

			const result = await getAllResourceTemplates(client, {}, node, 0);

			expect(result).toEqual({
				items: [
					{ uriTemplate: 'mem://a/{id}', name: 'a' },
					{ uriTemplate: 'mem://b/{id}', name: 'b' },
				],
				truncated: false,
			});
			expect(client.listResourceTemplates).toHaveBeenNthCalledWith(2, { cursor: 'c1' }, {});
		});
	});

	describe('getAllPrompts', () => {
		const node = mockDeep<INode>();

		it('aggregates prompts across pages', async () => {
			const client = mockDeep<Client>();
			client.listPrompts
				.mockResolvedValueOnce({
					prompts: [{ name: 'first' }],
					nextCursor: 'c1',
				})
				.mockResolvedValueOnce({
					prompts: [{ name: 'second' }],
				});

			const result = await getAllPrompts(client, {}, node, 0);

			expect(result).toEqual({
				items: [{ name: 'first' }, { name: 'second' }],
				truncated: false,
			});
			expect(client.listPrompts).toHaveBeenNthCalledWith(1, { cursor: undefined }, {});
			expect(client.listPrompts).toHaveBeenNthCalledWith(2, { cursor: 'c1' }, {});
		});
	});

	describe('mapCapabilityError', () => {
		const node = mockDeep<INode>();

		it('maps a missing resources capability to a NodeOperationError', () => {
			const mapped = mapCapabilityError(
				node,
				2,
				'resources',
				'resources/list',
				new McpError(ErrorCode.MethodNotFound, 'Method not found'),
			);

			expect(mapped).toBeInstanceOf(NodeOperationError);
			const nodeError = mapped as NodeOperationError;
			expect(nodeError.message).toBe(
				'This MCP server does not support resources (required for "resources/list").',
			);
			expect(nodeError.description).toBe('MCP error -32601: Method not found');
			expect(nodeError.context.itemIndex).toBe(2);
		});

		it('maps a missing prompts capability to a NodeOperationError', () => {
			const mapped = mapCapabilityError(
				node,
				0,
				'prompts',
				'prompts/get',
				new McpError(ErrorCode.MethodNotFound, 'Method not found'),
			);

			expect(mapped).toBeInstanceOf(NodeOperationError);
			expect(mapped.message).toBe(
				'This MCP server does not support prompts (required for "prompts/get").',
			);
		});

		it('passes through other MCP errors unchanged', () => {
			const error = new McpError(ErrorCode.InternalError, 'boom');
			expect(mapCapabilityError(node, 0, 'resources', 'resources/list', error)).toBe(error);
		});

		it('passes through a normal Error unchanged', () => {
			const error = new Error('boom');
			expect(mapCapabilityError(node, 0, 'resources', 'resources/list', error)).toBe(error);
		});

		it('wraps a non-Error value', () => {
			const mapped = mapCapabilityError(node, 0, 'resources', 'resources/list', 'boom');

			expect(mapped).toBeInstanceOf(Error);
			expect(mapped.message).toBe('boom');
		});
	});

	describe('buildPromptArguments', () => {
		const node = mockDeep<INode>();

		it('returns undefined for an empty collection', () => {
			expect(buildPromptArguments({}, node, 0)).toBeUndefined();
			expect(buildPromptArguments({ arguments: [] }, node, 0)).toBeUndefined();
		});

		it('builds a string map and coerces values', () => {
			const result = buildPromptArguments(
				{
					arguments: [
						{ name: 'Text', value: 'hello' },
						{ name: 'Count', value: 3 },
					],
				},
				node,
				0,
			);

			expect(result).toEqual({ Text: 'hello', Count: '3' });
		});

		it('uses a null-prototype accumulator', () => {
			const result = buildPromptArguments(
				{ arguments: [{ name: 'Text', value: 'hello' }] },
				node,
				0,
			);

			expect(Object.getPrototypeOf(result)).toBeNull();
		});

		it('keeps the last value for a duplicate name', () => {
			const result = buildPromptArguments(
				{
					arguments: [
						{ name: 'X', value: '1' },
						{ name: 'X', value: '2' },
					],
				},
				node,
				0,
			);

			expect(result).toEqual({ X: '2' });
		});

		it('uses an empty string when the value is missing', () => {
			const result = buildPromptArguments({ arguments: [{ name: 'X' }] }, node, 0);

			expect(result).toEqual({ X: '' });
		});

		it.each(['__proto__', 'constructor', 'prototype'])(
			'accepts the previously denylisted argument name %s',
			(name) => {
				const result = buildPromptArguments({ arguments: [{ name, value: 'x' }] }, node, 0);

				expect(result).toEqual({ [name]: 'x' });
				expect(Object.getPrototypeOf(result)).toBeNull();
			},
		);

		it('rejects an empty argument name', () => {
			expect(() =>
				buildPromptArguments({ arguments: [{ name: '', value: 'x' }] }, node, 0),
			).toThrow('Prompt argument name must be a non-empty string.');
		});

		it('rejects a non-string argument name', () => {
			expect(() =>
				buildPromptArguments({ arguments: [{ name: 123, value: 'x' }] }, node, 0),
			).toThrow('Prompt argument name must be a non-empty string.');
		});

		it('does not pollute Object.prototype', () => {
			const unsafeName = '__proto__';
			const result = buildPromptArguments(
				{ arguments: [{ name: unsafeName, value: 'x' }] },
				node,
				0,
			);

			expect(result?.['__proto__']).toBe('x');
			expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
		});
	});
});
