import { mock } from 'vitest-mock-extended';
import { z } from 'zod';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';

import { NodeToolResolverService } from '../node-tool-resolver.service';
import type { CompiledNodeToolset, CompiledOperationTool } from '../node-mcp-poc.types';

vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: vi.fn().mockResolvedValue({}),
}));

const documentProperty = {
	displayName: 'Document',
	name: 'documentId',
	type: 'resourceLocator' as const,
	default: { mode: 'list', value: '' },
};
const sheetProperty = {
	displayName: 'Sheet',
	name: 'sheetName',
	type: 'options' as const,
	default: '',
};

const tool: CompiledOperationTool = {
	name: 'sheet_append',
	description: 'Append',
	destructive: false,
	resource: 'sheet',
	operation: 'append',
	inputSchema: z.object({}).strict(),
	inputFields: {},
	jsonSchema: {},
	properties: [documentProperty, sheetProperty],
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
			path: 'sheetName',
			property: sheetProperty,
			kind: 'loadOptions',
			methodName: 'getSheets',
			dependencies: ['documentId.value'],
		},
	],
	deferredOptions: [],
};

const toolset: CompiledNodeToolset = {
	endpoint: {
		endpoint: 'test',
		type: 'json-schema',
		binding: {
			nodeType: 'n8n-nodes-base.googleSheets',
			nodeVersion: 4.7,
			projectId: 'project',
			userId: 'user',
			credentials: {},
		},
		flavor: { resolver: 'generic-batch', hideOptions: true },
	},
	tools: [tool],
};

describe('NodeToolResolverService', () => {
	const dynamicService = mock<DynamicNodeParametersService>();
	const resolver = new NodeToolResolverService(dynamicService);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns missing dependencies without invoking a node method', async () => {
		const result = await resolver.resolve(toolset, tool, 'sheetName', {});

		expect(result).toEqual({
			kind: 'needsInput',
			appliesTo: 'sheetName',
			missing: ['documentId.value'],
		});
		expect(dynamicService.getOptionsViaMethodName).not.toHaveBeenCalled();
	});

	it('strips additional locator fields before calling the internal resolver', async () => {
		dynamicService.getOptionsViaMethodName.mockResolvedValue([]);

		await resolver.resolve(toolset, tool, 'sheetName', {
			documentId: {
				__rl: true,
				mode: 'id',
				value: 'spreadsheet-id',
				unexpected: 'discard me',
			},
		});

		expect(dynamicService.getOptionsViaMethodName).toHaveBeenCalledWith(
			'getSheets',
			'parameters.sheetName',
			expect.anything(),
			expect.anything(),
			expect.objectContaining({
				documentId: { __rl: true, mode: 'id', value: 'spreadsheet-id' },
			}),
			expect.anything(),
		);
	});

	it('batches in dependency order and stops when a choice is required', async () => {
		dynamicService.getResourceLocatorResults.mockResolvedValue({
			results: [{ name: 'Orders', value: 'spreadsheet-id' }],
		});
		dynamicService.getOptionsViaMethodName.mockResolvedValue([
			{ name: 'January', value: 'jan' },
			{ name: 'February', value: 'feb' },
		]);

		const result = await resolver.resolveBatch(toolset, tool, {}, { documentId: 'Orders' });

		expect(dynamicService.getResourceLocatorResults).toHaveBeenCalledWith(
			'searchDocuments',
			'parameters.documentId',
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			'Orders',
			undefined,
		);
		expect(dynamicService.getOptionsViaMethodName).toHaveBeenCalledWith(
			'getSheets',
			'parameters.sheetName',
			expect.anything(),
			expect.anything(),
			expect.objectContaining({
				documentId: { __rl: true, mode: 'list', value: 'spreadsheet-id' },
			}),
			expect.anything(),
		);
		expect(result.resolved).toEqual({
			documentId: { mode: 'list', value: 'spreadsheet-id' },
		});
		expect(result.choicesRequired).toEqual([expect.objectContaining({ appliesTo: 'sheetName' })]);
		expect(result.remaining).toEqual(['sheetName']);
	});

	it('writes resolved nested parameter paths without replacing their parent', async () => {
		const nestedTool: CompiledOperationTool = {
			...tool,
			dynamicParameters: [
				{
					path: 'additionalFields.model',
					property: sheetProperty,
					kind: 'loadOptions',
					methodName: 'getModels',
					dependencies: [],
				},
				{
					path: 'additionalFields.version',
					property: sheetProperty,
					kind: 'loadOptions',
					methodName: 'getVersions',
					dependencies: ['additionalFields.model'],
				},
			],
		};
		dynamicService.getOptionsViaMethodName
			.mockResolvedValueOnce([{ name: 'Model', value: 'model-id' }])
			.mockResolvedValueOnce([{ name: 'Version', value: 'version-id' }]);

		await resolver.resolveBatch(
			{ ...toolset, tools: [nestedTool] },
			nestedTool,
			{},
			{ 'additionalFields.model': 'Model' },
		);

		expect(dynamicService.getOptionsViaMethodName).toHaveBeenLastCalledWith(
			'getVersions',
			'parameters.additionalFields.version',
			expect.anything(),
			expect.anything(),
			expect.objectContaining({
				additionalFields: { model: 'model-id' },
			}),
			expect.anything(),
		);
	});

	it('resolves ampersand dependencies relative to a repeated collection item', async () => {
		const selectProperty = {
			displayName: 'Select Value',
			name: 'selectValue',
			type: 'options' as const,
			default: '',
		};
		const nestedTool: CompiledOperationTool = {
			...tool,
			dynamicParameters: [
				{
					path: 'propertiesUi.propertyValues.selectValue',
					property: selectProperty,
					kind: 'loadOptions',
					methodName: 'getSelectValues',
					dependencies: ['dataSourceId', '&key'],
				},
			],
		};
		dynamicService.getOptionsViaMethodName.mockResolvedValue([{ name: 'Todo', value: 'todo' }]);

		const result = await resolver.resolve(
			{ ...toolset, tools: [nestedTool] },
			nestedTool,
			'propertiesUi.propertyValues.selectValue',
			{
				dataSourceId: 'database-id',
				propertiesUi: {
					propertyValues: [{ key: 'Status|select' }],
				},
			},
		);

		expect(dynamicService.getOptionsViaMethodName).toHaveBeenCalledWith(
			'getSelectValues',
			'parameters.propertiesUi.propertyValues[0].selectValue',
			expect.anything(),
			expect.anything(),
			expect.objectContaining({
				propertiesUi: {
					propertyValues: [{ key: 'Status|select' }],
				},
			}),
			expect.anything(),
		);
		expect(result).toEqual({
			kind: 'options',
			appliesTo: 'propertiesUi.propertyValues.selectValue',
			values: [{ name: 'Todo', value: 'todo' }],
			paginationToken: undefined,
		});
	});

	it('reports a relative dependency without accepting a root ampersand alias', async () => {
		const nestedTool: CompiledOperationTool = {
			...tool,
			dynamicParameters: [
				{
					path: 'propertiesUi.propertyValues.selectValue',
					property: sheetProperty,
					kind: 'loadOptions',
					methodName: 'getSelectValues',
					dependencies: ['dataSourceId', '&key'],
				},
			],
		};

		const result = await resolver.resolve(
			{ ...toolset, tools: [nestedTool] },
			nestedTool,
			'propertiesUi.propertyValues.selectValue',
			{
				dataSourceId: 'database-id',
				'&key': 'Status|select',
			},
		);

		expect(result).toEqual({
			kind: 'needsInput',
			appliesTo: 'propertiesUi.propertyValues.selectValue',
			missing: ['key'],
		});
		expect(dynamicService.getOptionsViaMethodName).not.toHaveBeenCalled();
	});
});
