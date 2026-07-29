import { mock } from 'vitest-mock-extended';
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';

import type { JsonSchemaNodeMcpPocEndpoint } from '../../node-mcp-poc.types';
import { NodeToolsetCompiler } from '../node-toolset-compiler';

const endpoint: JsonSchemaNodeMcpPocEndpoint = {
	endpoint: 'test',
	type: 'json-schema',
	binding: {
		nodeType: 'n8n-nodes-base.test',
		nodeVersion: 1,
		projectId: 'project',
		userId: 'user',
		credentials: {},
	},
	flavor: { resolver: 'generic-single', hideOptions: false },
};

const description: INodeTypeDescription = {
	displayName: 'Test',
	name: 'test',
	group: ['transform'],
	version: 1,
	description: 'Test node',
	defaults: { name: 'Test' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			default: 'message',
			options: [{ name: 'Message', value: 'message' }],
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			default: 'send',
			displayOptions: { show: { resource: ['message'] } },
			options: [{ name: 'Send', value: 'send', action: 'Send a message' }],
		},
		{
			displayName: 'Recipient',
			name: 'recipient',
			type: 'string',
			default: '',
			required: true,
			builderHint: {
				propertyHint: 'Editor-only recipient instructions.',
				mcpHint: 'MCP-specific recipient instructions.',
				jsonSchemaHint: 'JSON Schema-specific recipient instructions.',
			},
			displayOptions: { show: { resource: ['message'], operation: ['send'] } },
		},
		{
			displayName: 'Tags',
			name: 'tags',
			type: 'string',
			default: [],
			typeOptions: { multipleValues: true },
			displayOptions: { show: { operation: ['send'] } },
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			default: {},
			options: [
				{
					displayName: 'Model',
					name: 'model',
					type: 'options',
					default: '',
					typeOptions: {
						loadOptionsMethod: 'getModels',
						loadOptionsDependsOn: ['recipient'],
					},
				},
			],
		},
	],
};

describe('NodeToolsetCompiler', () => {
	const nodeTypes = mock<NodeTypes>();
	const compiler = new NodeToolsetCompiler(nodeTypes);

	beforeEach(() => {
		nodeTypes.getByNameAndVersion.mockReturnValue({ description } as INodeType);
	});

	it('creates one operation tool with scoped required fields and arrays', () => {
		const toolset = compiler.compile(endpoint);

		expect(toolset.tools).toHaveLength(1);
		expect(toolset.tools[0].name).toBe('message_send');
		expect(toolset.tools[0].description).toContain('Send a message — Node: Test (v1).');
		expect(toolset.tools[0].jsonSchema.required).toEqual(['recipient']);
		expect(toolset.tools[0].jsonSchema.properties?.recipient?.description).toContain(
			'JSON Schema-specific recipient instructions.',
		);
		expect(toolset.tools[0].jsonSchema.properties?.recipient?.description).not.toContain(
			'MCP-specific recipient instructions.',
		);
		expect(toolset.tools[0].jsonSchema.properties?.recipient?.description).not.toContain(
			'Editor-only recipient instructions.',
		);
		expect(toolset.tools[0].jsonSchema.properties?.tags).toMatchObject({
			type: 'array',
			items: { type: 'string' },
		});
		expect(toolset.tools[0].dynamicParameters).toEqual([
			expect.objectContaining({
				path: 'additionalFields.model',
				kind: 'loadOptions',
				methodName: 'getModels',
				dependencies: ['recipient'],
			}),
		]);
	});

	it('defers Options and Additional Fields children for list_options', () => {
		const toolset = compiler.compile({
			...endpoint,
			flavor: { resolver: 'generic-batch', hideOptions: true },
		});
		const tool = toolset.tools[0];

		expect(tool.jsonSchema.properties?.additionalFields).toMatchObject({
			type: 'object',
			additionalProperties: true,
		});
		expect(tool.deferredOptions).toEqual([
			expect.objectContaining({
				path: 'additionalFields',
				displayName: 'Additional Fields',
			}),
		]);
		expect(tool.description).toContain('call list_options');
	});

	it('emits RFC-shaped locators, conditionals, hidden defaults, and dynamic metadata', () => {
		const completeDescription: INodeTypeDescription = {
			...description,
			properties: [
				...description.properties.map((property) =>
					property.name === 'operation'
						? {
								...property,
								options: [
									...(property.options ?? []),
									{ name: 'Send and Wait', value: 'sendAndWait' },
								],
							}
						: property,
				),
				{
					displayName: 'Message Type',
					name: 'messageType',
					type: 'options',
					default: 'text',
					options: [
						{ name: 'Text', value: 'text' },
						{ name: 'Blocks', value: 'blocks' },
					],
				},
				{
					displayName: 'Text',
					name: 'text',
					type: 'string',
					default: '',
					required: true,
					displayOptions: { show: { messageType: ['text'] } },
				},
				{
					displayName: 'Channel',
					name: 'channel',
					type: 'resourceLocator',
					default: { mode: 'list', value: '' },
					modes: [
						{
							displayName: 'From List',
							name: 'list',
							type: 'list',
							typeOptions: { searchListMethod: 'getChannels' },
						},
						{ displayName: 'By ID', name: 'id', type: 'string' },
					],
				},
				{
					displayName: 'Credential',
					name: 'credential',
					type: 'credentials',
					default: '',
				},
				{
					displayName: 'Internal',
					name: 'internal',
					type: 'hidden',
					default: 'fixed',
				},
			],
		};
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: completeDescription,
		} as INodeType);

		const toolset = compiler.compile(endpoint);
		const tool = toolset.tools[0];

		expect(toolset.tools.map(({ name }) => name)).toEqual(['message_send']);
		expect(tool.hiddenDefaults).toEqual({ internal: 'fixed' });
		expect(tool.jsonSchema.properties).not.toHaveProperty('credential');
		expect(tool.jsonSchema.properties).not.toHaveProperty('internal');
		expect(tool.jsonSchema.properties?.channel).toMatchObject({
			'x-resource-locator': true,
			'x-dynamic': {
				resolver: 'message_send__resolve_channel',
				dependsOn: [],
			},
			oneOf: expect.arrayContaining([
				expect.objectContaining({
					properties: {
						mode: expect.objectContaining({ const: 'list' }),
						value: expect.any(Object),
					},
					required: ['mode', 'value'],
					additionalProperties: true,
				}),
			]),
		});
		expect(
			tool.inputFields.channel.safeParse({
				__rl: true,
				mode: 'list',
				value: 'channel-id',
			}).success,
		).toBe(true);
		expect(tool.jsonSchema.allOf).toContainEqual({
			if: {
				properties: { messageType: { const: 'text' } },
				required: ['messageType'],
			},
			then: { required: ['text'] },
		});
		expect(
			tool.inputSchema.safeParse({ recipient: 'person@example.com', messageType: 'text' }).success,
		).toBe(false);
		expect(
			tool.inputSchema.safeParse({
				recipient: 'person@example.com',
				messageType: 'text',
				text: 'Hello',
			}).success,
		).toBe(true);
	});

	it('derives standard JSON Schema constraints from the Zod input schema', () => {
		const typedDescription: INodeTypeDescription = {
			...description,
			properties: [
				...description.properties.slice(0, 2),
				{
					displayName: 'Count',
					name: 'count',
					type: 'number',
					default: 1,
					required: true,
					typeOptions: { numberPrecision: 0, minValue: 1, maxValue: 10 },
				},
				{
					displayName: 'Mode',
					name: 'mode',
					type: 'options',
					default: 'a',
					options: [
						{ name: 'Mode A', value: 'a' },
						{ name: 'Mode B', value: 'b' },
					],
				},
				{
					displayName: 'Tags',
					name: 'tags',
					type: 'multiOptions',
					default: [],
					options: [
						{ name: 'One', value: 'one' },
						{ name: 'Two', value: 'two' },
					],
				},
				{
					displayName: 'Date',
					name: 'date',
					type: 'dateTime',
					default: '',
					typeOptions: { dateOnly: true },
				},
				{
					displayName: 'Color',
					name: 'color',
					type: 'color',
					default: '#ffffff',
				},
				{
					displayName: 'Payload',
					name: 'payload',
					type: 'json',
					default: '{}',
				},
				{
					displayName: 'Secret',
					name: 'secret',
					type: 'string',
					default: '',
					typeOptions: { password: true },
				},
				{
					displayName: 'Rules',
					name: 'rules',
					type: 'fixedCollection',
					default: {},
					typeOptions: { minRequiredFields: 1, maxAllowedFields: 1 },
					options: [
						{
							displayName: 'Values',
							name: 'values',
							values: [
								{ displayName: 'First', name: 'first', type: 'string', default: '' },
								{ displayName: 'Second', name: 'second', type: 'string', default: '' },
							],
						},
					],
				},
				{
					displayName: 'Columns',
					name: 'columns',
					type: 'resourceMapper',
					default: { mappingMode: 'defineBelow', value: null },
					typeOptions: {
						resourceMapper: {
							resourceMapperMethod: 'getColumns',
							mode: 'update',
							supportAutoMap: true,
						},
					},
				},
			],
		};
		nodeTypes.getByNameAndVersion.mockReturnValue({ description: typedDescription } as INodeType);

		const tool = compiler.compile(endpoint).tools[0];

		expect(tool.jsonSchema.required).toEqual(['count']);
		expect(tool.jsonSchema.properties?.count).toMatchObject({
			type: 'integer',
			minimum: 1,
			maximum: 10,
			default: 1,
		});
		expect(tool.jsonSchema.properties?.mode).toMatchObject({
			type: 'string',
			enum: ['a', 'b'],
			'x-enumNames': ['Mode A', 'Mode B'],
			default: 'a',
		});
		expect(tool.jsonSchema.properties?.tags).toMatchObject({
			type: 'array',
			items: { type: 'string', enum: ['one', 'two'] },
			uniqueItems: true,
		});
		expect(tool.jsonSchema.properties?.date).toMatchObject({
			type: 'string',
			format: 'date',
		});
		expect(tool.jsonSchema.properties?.color).toMatchObject({
			type: 'string',
			pattern: '^#?[0-9A-Fa-f]{6}$',
		});
		expect(tool.jsonSchema.properties?.payload).toMatchObject({
			contentMediaType: 'application/json',
			anyOf: expect.arrayContaining([
				expect.objectContaining({ type: 'object' }),
				expect.objectContaining({ type: 'array' }),
				expect.objectContaining({ type: 'string' }),
			]),
		});
		expect(tool.jsonSchema.properties?.secret).toMatchObject({
			type: 'string',
			writeOnly: true,
			'x-sensitive': true,
		});
		expect(tool.inputSchema.safeParse({ count: 1, tags: ['one', 'one'] }).success).toBe(false);
		expect(tool.inputSchema.safeParse({ count: '={{ 1 + 1 }}' }).success).toBe(true);
		expect(
			tool.inputSchema.safeParse({
				count: 1,
				date: '2026-07-28T10:00:00+02:00',
			}).success,
		).toBe(true);
		expect(tool.inputSchema.safeParse({ count: 1, rules: { values: {} } }).success).toBe(false);
		expect(
			tool.inputSchema.safeParse({
				count: 1,
				rules: { values: { first: 'a', second: 'b' } },
			}).success,
		).toBe(false);
		expect(
			tool.inputSchema.safeParse({
				count: 1,
				rules: { values: { first: 'a' } },
			}).success,
		).toBe(true);
		expect(
			tool.inputSchema.safeParse({
				count: 1,
				columns: {
					mappingMode: 'defineBelow',
					matchingColumns: ['id', 'id'],
				},
			}).success,
		).toBe(false);
	});

	it('applies MCP property defaults and hides properties and options', () => {
		const mcpDescription: INodeTypeDescription = {
			...description,
			properties: [
				...description.properties.slice(0, 2),
				{
					displayName: 'Content Type',
					name: 'contentType',
					type: 'options',
					options: [
						{ name: 'Block Builder', value: 'blockUi', mcp: { hide: true } },
						{ name: 'JSON', value: 'json' },
						{ name: 'Markdown', value: 'markdown' },
					],
					default: 'blockUi',
					mcp: { overrideDefault: 'markdown' },
				},
				{
					displayName: 'Block Builder',
					name: 'blockUi',
					type: 'fixedCollection',
					default: {},
					mcp: { hide: true },
					options: [],
				},
			],
		};
		nodeTypes.getByNameAndVersion.mockReturnValue({ description: mcpDescription } as INodeType);

		const compiled = compiler.compile(endpoint).tools[0];

		expect(compiled.jsonSchema.properties?.contentType).toMatchObject({
			default: 'markdown',
			enum: ['json', 'markdown'],
		});
		expect(compiled.jsonSchema.properties).not.toHaveProperty('blockUi');
		expect(compiled.properties).toContainEqual(
			expect.objectContaining({ name: 'contentType', default: 'markdown' }),
		);
		expect(compiled.properties).not.toContainEqual(expect.objectContaining({ name: 'blockUi' }));
	});
});
