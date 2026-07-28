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
			default: { mappingMode: 'defineBelow', value: null },
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
	],
};

const documentProperty = description.properties[2];
const columnsProperty = description.properties[3];
const autoMapInputDataProperty = description.properties[4];
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
	properties: [documentProperty, columnsProperty, autoMapInputDataProperty],
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
				resolve: { dependsOn: ['documentId'] },
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
