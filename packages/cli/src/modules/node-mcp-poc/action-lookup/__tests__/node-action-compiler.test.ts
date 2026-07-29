import { mock } from 'vitest-mock-extended';
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import type { NodeTypes } from '@/node-types';

import type { ActionLookupNodeMcpPocEndpoint } from '../../node-mcp-poc.types';
import type {
	CompiledNodeToolset,
	CompiledOperationTool,
} from '../../json-schema/node-mcp-poc.types';
import type { NodeToolsetCompiler } from '../../json-schema/node-toolset-compiler';
import { NodeActionCompiler } from '../node-action-compiler';

const endpoint: ActionLookupNodeMcpPocEndpoint = {
	endpoint: 'actions',
	type: 'action-lookup',
	bindings: [
		{
			nodeType: 'n8n-nodes-base.test',
			nodeVersion: 2,
			projectId: 'project',
			userId: 'user',
			credentials: { testApi: { id: 'credential', name: 'Test' } },
		},
	],
};

const description: INodeTypeDescription = {
	displayName: 'Test Node',
	name: 'test',
	group: ['transform'],
	version: 2,
	description: 'Test node',
	defaults: { name: 'Test' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			default: 'sheet',
			options: [{ name: 'Sheet', value: 'sheet' }],
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			default: 'append',
			options: [{ name: 'Append Row', value: 'append', action: 'Append a row' }],
		},
		{
			displayName: 'Document',
			name: 'documentId',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			required: true,
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: { searchListMethod: 'searchDocuments' },
				},
				{ displayName: 'By ID', name: 'id', type: 'string' },
				{ displayName: 'By URL', name: 'url', type: 'string' },
			],
		},
		{
			displayName: 'Columns',
			name: 'columns',
			type: 'resourceMapper',
			noDataExpression: true,
			default: { mappingMode: 'defineBelow', value: null },
			builderHint: {
				propertyHint: 'Editor-only mapper instructions.',
				mcpHint: 'MCP-specific mapper instructions.',
				jsonSchemaHint: 'JSON Schema-specific mapper instructions.',
			},
			typeOptions: {
				resourceMapper: { resourceMapperMethod: 'getColumns', mode: 'add' },
				loadOptionsDependsOn: ['documentId.value'],
			},
		},
		{
			displayName: 'Auto Map Input Data',
			name: 'autoMapInputData',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Location',
			name: 'locationDefine',
			type: 'fixedCollection',
			default: { values: {} },
			options: [
				{
					displayName: 'Values',
					name: 'values',
					values: [
						{
							displayName: 'Header Row',
							name: 'headerRow',
							type: 'number',
							default: 1,
						},
					],
				},
			],
		},
		{
			displayName: 'Addresses',
			name: 'addressOptions',
			type: 'fixedCollection',
			default: {},
			typeOptions: { multipleValues: true },
			options: [
				{
					displayName: 'Address Properties',
					name: 'addressProperties',
					values: [
						{
							displayName: 'Address',
							name: 'address',
							type: 'string',
							default: '',
						},
					],
				},
			],
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			default: {},
			options: [
				{
					displayName: 'Retained Option',
					name: 'retainedOption',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Handling Extra Data',
					name: 'handlingExtraData',
					type: 'string',
					default: '',
					displayOptions: {
						show: { '/dataMode': ['autoMapInputData'] },
					},
				},
				{
					displayName: 'Handling Extra Data',
					name: 'handlingExtraData',
					type: 'string',
					default: '',
					displayOptions: {
						show: { '/columns.mappingMode': ['autoMapInputData'] },
					},
				},
			],
		},
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

const documentProperty = description.properties[2];
const columnsProperty = description.properties[3];
const autoMapInputDataProperty = description.properties[4];
const locationProperty = description.properties[5];
const addressProperty = description.properties[6];
const optionsProperty = description.properties[7];
const contentTypeProperty = description.properties[8];
const blockBuilderProperty = description.properties[9];
const inputFields = {
	documentId: z.object({ mode: z.string(), value: z.union([z.string(), z.number()]) }),
	columns: z
		.object({
			mappingMode: z.literal('defineBelow'),
			value: z.record(z.string(), z.unknown()).optional(),
		})
		.optional(),
};
const tool: CompiledOperationTool = {
	name: 'sheet_append',
	description: 'Append a row — Node: Test Node (v2).',
	destructive: false,
	resource: 'sheet',
	operation: 'append',
	inputSchema: z.object(inputFields).strict(),
	inputFields,
	jsonSchema: {},
	properties: [
		documentProperty,
		columnsProperty,
		autoMapInputDataProperty,
		locationProperty,
		addressProperty,
		optionsProperty,
		contentTypeProperty,
		blockBuilderProperty,
	],
	hiddenDefaults: {},
	dynamicParameters: [
		{
			path: 'documentId',
			property: documentProperty,
			kind: 'listSearch',
			methodName: 'searchDocuments',
			dependencies: [],
		},
		{
			path: 'columns',
			property: columnsProperty,
			kind: 'resourceMapper',
			methodName: 'getColumns',
			dependencies: ['documentId.value'],
		},
	],
	deferredOptions: [],
};

describe('NodeActionCompiler', () => {
	const nodeTypes = mock<NodeTypes>();
	const toolsetCompiler = mock<NodeToolsetCompiler>();
	const compiler = new NodeActionCompiler(nodeTypes, toolsetCompiler);

	beforeEach(() => {
		nodeTypes.getByNameAndVersion.mockReturnValue({ description } as INodeType);
		toolsetCompiler.compile.mockImplementation(
			(jsonSchemaEndpoint): CompiledNodeToolset => ({
				endpoint: jsonSchemaEndpoint,
				tools: [tool],
			}),
		);
	});

	it('creates stable action IDs and compact agent-facing fields', () => {
		const first = compiler.compile(endpoint).actions[0];
		const second = compiler.compile(endpoint).actions[0];

		expect(first.id).toBe('n8n-nodes-base.test@2/sheet.append');
		expect(second.id).toBe(first.id);
		expect(first.summary).toMatchObject({
			name: 'Append Row',
			description: 'Append a row Node: Test Node.',
			requiresCredential: true,
			hasDynamicParameters: true,
		});
		expect(first.definition.input.fields).toEqual([
			expect.objectContaining({
				name: 'documentId',
				type: 'resource',
				accepts: ['id', 'url'],
				resolve: { dependsOn: [] },
			}),
			expect.objectContaining({
				name: 'columns',
				type: 'object',
				acceptsExpression: false,
				description: 'MCP-specific mapper instructions.',
				resolve: { dependsOn: ['documentId'] },
			}),
			expect.objectContaining({
				name: 'locationDefine',
				type: 'object',
				fields: [expect.objectContaining({ name: 'headerRow', type: 'number' })],
			}),
			expect.objectContaining({
				name: 'addressOptions',
				type: 'array',
				items: expect.objectContaining({
					type: 'object',
					fields: [expect.objectContaining({ name: 'address', type: 'string' })],
				}),
			}),
			expect.objectContaining({
				name: 'options',
				fields: [expect.objectContaining({ name: 'retainedOption' })],
			}),
			expect.objectContaining({
				name: 'contentType',
				default: 'markdown',
				choices: [
					expect.objectContaining({ value: 'json' }),
					expect.objectContaining({ value: 'markdown' }),
				],
			}),
		]);
	});

	it('applies the same visibility policy while building the catalog', () => {
		expect(
			compiler.compile({
				...endpoint,
				policy: { denyActions: ['n8n-nodes-base.test@2/sheet.append'] },
			}).actions,
		).toEqual([]);
	});
});
