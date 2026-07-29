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
	noDataExpression: true,
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
const upsertColumnsProperty: INodeProperties = {
	...columnsProperty,
	typeOptions: {
		resourceMapper: { resourceMapperMethod: 'getColumns', mode: 'upsert' },
	},
};
const upsertTool: CompiledOperationTool = {
	...tool,
	name: 'sheet_appendOrUpdate',
	operation: 'appendOrUpdate',
	properties: [documentProperty, upsertColumnsProperty],
	dynamicParameters: tool.dynamicParameters.map((descriptor) =>
		descriptor.path === 'columns' ? { ...descriptor, property: upsertColumnsProperty } : descriptor,
	),
};
const upsertToolset: CompiledNodeToolset = { ...toolset, tools: [upsertTool] };
const upsertPlan: CompiledActionPlan = {
	...plan,
	id: 'n8n-nodes-base.test@1/sheet.appendOrUpdate',
	toolset: upsertToolset,
	tool: upsertTool,
	dynamicParameters: upsertTool.dynamicParameters,
};
const locationProperty: INodeProperties = {
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
};
const addressProperty: INodeProperties = {
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
};
const optionsProperty: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	default: {},
	options: [locationProperty],
};
const additionalFieldsProperty: INodeProperties = {
	displayName: 'Additional Fields',
	name: 'additionalFields',
	type: 'collection',
	default: {},
	options: [addressProperty],
};
const fixedCollectionTool: CompiledOperationTool = {
	...tool,
	properties: [documentProperty, columnsProperty, optionsProperty, additionalFieldsProperty],
};
const fixedCollectionToolset: CompiledNodeToolset = {
	...toolset,
	tools: [fixedCollectionTool],
};
const fixedCollectionPlan: CompiledActionPlan = {
	...plan,
	toolset: fixedCollectionToolset,
	tool: fixedCollectionTool,
};

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

	it('preserves expressions in supported fields', async () => {
		executor.execute.mockResolvedValue({
			status: 'success',
			data: [{ json: { updatedRows: 1 } }],
		});

		await service.run('actions', plan.id, {
			documentId: '={{ $json.documentId }}',
			columns: { Amount: '={{ $json.amount }}' },
		});

		expect(executor.execute).toHaveBeenCalledWith(toolset, tool, {
			documentId: { mode: 'id', value: '={{ $json.documentId }}' },
			columns: {
				mappingMode: 'defineBelow',
				value: { Amount: '={{ $json.amount }}' },
			},
		});
	});

	it('strips resource-locator metadata and preserves a mapper envelope', async () => {
		catalogs.findAction.mockReturnValue(upsertPlan);
		resolver.getResourceMapperSchema.mockReturnValue([
			{
				id: 'Order',
				displayName: 'Order',
				defaultMatch: true,
				required: false,
				display: true,
			},
		]);
		executor.execute.mockResolvedValue({
			status: 'success',
			data: [{ json: { updatedRows: 1 } }],
		});

		await service.run('actions', upsertPlan.id, {
			documentId: {
				__rl: true,
				mode: 'id',
				value: 'spreadsheet-id',
				cachedResultName: 'Financial reports',
			},
			columns: {
				mappingMode: 'defineBelow',
				value: { Order: 'O-23523', Status: 'Shipped' },
				matchingColumns: ['Order'],
				schema: [{ id: 'untrusted' }],
			},
		});

		expect(executor.execute).toHaveBeenCalledWith(upsertToolset, upsertTool, {
			documentId: { mode: 'id', value: 'spreadsheet-id' },
			columns: {
				mappingMode: 'defineBelow',
				value: { Order: 'O-23523', Status: 'Shipped' },
				matchingColumns: ['Order'],
			},
		});
	});

	it('derives default matching columns from the resolved mapper schema', async () => {
		catalogs.findAction.mockReturnValue(upsertPlan);
		resolver.getResourceMapperSchema.mockReturnValue([
			{
				id: 'Order',
				displayName: 'Order',
				defaultMatch: true,
				required: false,
				display: true,
			},
			{
				id: 'Status',
				displayName: 'Status',
				defaultMatch: false,
				required: false,
				display: true,
			},
		]);
		executor.execute.mockResolvedValue({
			status: 'success',
			data: [{ json: { updatedRows: 1 } }],
		});

		await service.run('actions', upsertPlan.id, {
			documentId: 'spreadsheet-id',
			columns: { Order: 'O-23523', Status: 'Shipped' },
		});

		expect(executor.execute).toHaveBeenCalledWith(upsertToolset, upsertTool, {
			documentId: { mode: 'id', value: 'spreadsheet-id' },
			columns: {
				mappingMode: 'defineBelow',
				value: { Order: 'O-23523', Status: 'Shipped' },
				matchingColumns: ['Order'],
			},
		});
	});

	it('reintroduces single-option fixed-collection nesting before execution', async () => {
		catalogs.findAction.mockReturnValue(fixedCollectionPlan);
		executor.execute.mockResolvedValue({
			status: 'success',
			data: [{ json: { updatedRows: 1 } }],
		});

		await service.run('actions', fixedCollectionPlan.id, {
			documentId: 'spreadsheet-id',
			columns: { Amount: 10 },
			options: {
				locationDefine: { headerRow: 2 },
			},
			additionalFields: {
				addressOptions: [{ address: 'First' }, { address: 'Second' }],
			},
		});

		expect(executor.execute).toHaveBeenCalledWith(fixedCollectionToolset, fixedCollectionTool, {
			documentId: { mode: 'id', value: 'spreadsheet-id' },
			columns: { mappingMode: 'defineBelow', value: { Amount: 10 } },
			options: {
				locationDefine: { values: { headerRow: 2 } },
			},
			additionalFields: {
				addressOptions: {
					addressProperties: [{ address: 'First' }, { address: 'Second' }],
				},
			},
		});
	});

	it('rejects malformed whole parameter values with a friendly error', async () => {
		await expect(
			service.run('actions', plan.id, {
				documentId: { __rl: true, mode: 'id' },
				columns: { Amount: 10 },
			}),
		).rejects.toThrow(
			'Invalid action input for "documentId": expected a resource ID, URL, name, or valid { mode, value } object',
		);

		catalogs.findAction.mockReturnValue(upsertPlan);
		await expect(
			service.run('actions', upsertPlan.id, {
				documentId: 'spreadsheet-id',
				columns: {
					values: { Order: 'O-23523' },
					matchingColumns: 'Order',
				},
			}),
		).rejects.toThrow(
			'Invalid action input for "columns": expected matchingColumns to be a non-empty array of column names',
		);
	});
});
