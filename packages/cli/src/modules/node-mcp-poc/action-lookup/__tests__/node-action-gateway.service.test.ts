import { mock } from 'vitest-mock-extended';
import type { INodeProperties, ResourceMapperField } from 'n8n-workflow';
import { z } from 'zod';

import type { NodeToolExecutorService } from '../../json-schema/node-tool-executor.service';
import type { NodeToolResolverService } from '../../json-schema/node-tool-resolver.service';
import type {
	CompiledNodeToolset,
	CompiledOperationTool,
} from '../../json-schema/node-mcp-poc.types';
import type { CompiledActionPlan, VisibleActionCatalog } from '../action-lookup.types';
import { NodeActionGatewayService } from '../node-action-gateway.service';
import type { VisibleActionCatalogRegistry } from '../visible-action-catalog';

const documentProperty: INodeProperties = {
	displayName: 'Document',
	name: 'documentId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	modes: [
		{ displayName: 'From List', name: 'list', type: 'list' },
		{ displayName: 'By ID', name: 'id', type: 'string' },
	],
};
const columnsProperty: INodeProperties = {
	displayName: 'Columns',
	name: 'columns',
	type: 'resourceMapper',
	default: { mappingMode: 'defineBelow', value: null },
	typeOptions: {
		resourceMapper: { resourceMapperMethod: 'getColumns', mode: 'add' },
	},
};
const tool: CompiledOperationTool = {
	name: 'sheet_append',
	description: 'Append',
	destructive: false,
	resource: 'sheet',
	operation: 'append',
	inputSchema: z.object({}).passthrough(),
	inputFields: {},
	jsonSchema: {},
	properties: [documentProperty, columnsProperty],
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
const toolset: CompiledNodeToolset = {
	endpoint: {
		endpoint: 'actions:test',
		type: 'json-schema',
		binding: {
			nodeType: 'n8n-nodes-base.test',
			nodeVersion: 1,
			projectId: 'project',
			userId: 'user',
			credentials: {},
		},
		flavor: { resolver: 'generic-single', hideOptions: false },
	},
	tools: [tool],
};
const plan: CompiledActionPlan = {
	id: 'n8n-nodes-base.test@1/sheet.append',
	summary: {
		id: 'n8n-nodes-base.test@1/sheet.append',
		node: { type: 'n8n-nodes-base.test', version: 1, name: 'Test' },
		name: 'Append',
		description: 'Append',
		destructive: false,
		requiresCredential: false,
		hasDynamicParameters: true,
	},
	definition: {
		id: 'n8n-nodes-base.test@1/sheet.append',
		node: { type: 'n8n-nodes-base.test', version: 1, name: 'Test' },
		action: {
			resource: 'sheet',
			operation: 'append',
			name: 'Append',
			description: 'Append',
			destructive: false,
		},
		input: {
			fields: [
				{
					name: 'documentId',
					label: 'Document',
					type: 'resource',
					required: true,
					resolve: { dependsOn: [] },
				},
				{
					name: 'columns',
					label: 'Columns',
					type: 'object',
					required: true,
					resolve: { dependsOn: ['documentId'] },
				},
			],
		},
	},
	toolset,
	tool,
	dynamicParameters: tool.dynamicParameters,
	resourceModesByPath: new Map([['documentId', documentProperty.modes ?? []]]),
};
const catalog: VisibleActionCatalog = { endpoint: 'actions', actions: [plan] };

describe('NodeActionGatewayService', () => {
	const catalogs = mock<VisibleActionCatalogRegistry>();
	const resolver = mock<NodeToolResolverService>();
	const executor = mock<NodeToolExecutorService>();
	const service = new NodeActionGatewayService(catalogs, resolver, executor);

	beforeEach(() => {
		catalogs.get.mockReturnValue(catalog);
		catalogs.findAction.mockReturnValue(plan);
	});

	it('does not distinguish hidden actions from unknown actions', () => {
		catalogs.findAction.mockImplementation(() => {
			throw new Error('Action not found');
		});

		expect(() => service.get('actions', 'hidden')).toThrow('Action not found');
		expect(() => service.get('actions', 'unknown')).toThrow('Action not found');
	});

	it('normalizes scalar locators and reports public dependency paths', async () => {
		resolver.resolve.mockResolvedValue({
			kind: 'needsInput',
			appliesTo: 'columns',
			missing: ['documentId.value'],
		});

		await expect(
			service.resolve('actions', {
				actionId: plan.id,
				parameter: 'columns',
				knownInput: {},
			}),
		).resolves.toEqual({
			status: 'needsInput',
			parameter: 'columns',
			missing: ['documentId'],
		});

		resolver.resolve.mockResolvedValue({
			kind: 'options',
			appliesTo: 'columns',
			values: [],
		});
		await service.resolve('actions', {
			actionId: plan.id,
			parameter: 'columns',
			knownInput: { documentId: 'spreadsheet-id' },
		});
		expect(resolver.resolve).toHaveBeenLastCalledWith(
			toolset,
			tool,
			'columns',
			{ documentId: { mode: 'id', value: 'spreadsheet-id' } },
			undefined,
			undefined,
		);
	});

	it('returns mapper fields in the public field format', async () => {
		const fields: ResourceMapperField[] = [
			{
				id: 'Amount',
				displayName: 'Amount',
				defaultMatch: false,
				required: true,
				display: true,
				type: 'number',
			},
			{
				id: 'autoMapInputData',
				displayName: 'Auto Map Input Data',
				defaultMatch: false,
				required: false,
				display: true,
				type: 'boolean',
			},
		];
		resolver.resolve.mockResolvedValue({
			kind: 'resourceMapperFields',
			appliesTo: 'columns',
			fields,
		});

		await expect(
			service.resolve('actions', {
				actionId: plan.id,
				parameter: 'columns',
				knownInput: { documentId: 'spreadsheet-id' },
			}),
		).resolves.toMatchObject({
			status: 'resolved',
			field: {
				name: 'columns',
				type: 'object',
				fields: [{ name: 'Amount', type: 'number', required: true }],
			},
		});
	});

	it('reauthorizes and converts public mapper values before execution', async () => {
		executor.execute.mockResolvedValue({
			status: 'success',
			data: [{ json: { updatedRows: 1 } }],
		});

		await service.run('actions', plan.id, {
			documentId: 'spreadsheet-id',
			columns: { Amount: 10 },
		});

		expect(catalogs.findAction).toHaveBeenCalledWith(catalog, plan.id);
		expect(executor.execute).toHaveBeenCalledWith(toolset, tool, {
			documentId: { mode: 'id', value: 'spreadsheet-id' },
			columns: { mappingMode: 'defineBelow', value: { Amount: 10 } },
		});
	});
});
