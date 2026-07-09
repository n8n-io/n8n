import { mock } from 'vitest-mock-extended';
import type { User } from '@n8n/db';
import type {
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { buildGetResourceLocatorOptionsTool } from '../get-resource-locator-options.tool';

vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: vi.fn().mockResolvedValue({}),
}));

const ctx = {
	resumeData: undefined,
	suspend: vi.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

const user = mock<User>({ id: 'user-1' });

function makeNodeType(description: Partial<INodeTypeDescription>): INodeType {
	return {
		description: {
			name: 'n8n-nodes-base.linearTool',
			displayName: 'Linear Tool',
			version: 1,
			defaults: { name: 'Linear Tool' },
			inputs: [],
			outputs: [],
			properties: [],
			...description,
		},
	} as INodeType;
}

function makeTool(nodeType: INodeType) {
	const dynamicNodeParametersService = mock<DynamicNodeParametersService>();
	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
	dynamicNodeParametersService.refineResourceIds.mockResolvedValue();

	const tool = buildGetResourceLocatorOptionsTool({
		dynamicNodeParametersService,
		nodeTypes,
		user,
		projectId: 'project-1',
	});

	return { tool, dynamicNodeParametersService, nodeTypes };
}

describe('get_resource_locator_options tool', () => {
	it('returns missing_credentials for credentialed dynamic fields without credentials', async () => {
		const { tool, dynamicNodeParametersService } = makeTool(
			makeNodeType({
				credentials: [{ name: 'linearOAuth2Api', required: true }],
				properties: [
					{
						displayName: 'Team Name or ID',
						name: 'teamId',
						type: 'options',
						default: '',
						typeOptions: { loadOptionsMethod: 'getTeams' },
					},
				],
			}),
		);

		const result = await tool.handler!(
			{
				nodeType: 'n8n-nodes-base.linearTool',
				nodeTypeVersion: 1,
				parameterPath: 'teamId',
				nodeParameters: { resource: 'issue', operation: 'create' },
			},
			ctx,
		);

		expect(result).toEqual({
			ok: false,
			code: 'missing_credentials',
			message: expect.stringContaining('ask_credential'),
			credentialSlots: [
				{
					credentialType: 'linearOAuth2Api',
					credentialSlot: 'linearOAuth2Api',
				},
			],
		});
		expect(dynamicNodeParametersService.getOptionsViaMethodName).not.toHaveBeenCalled();
	});

	it('loads classic dynamic options and returns raw parameter values', async () => {
		const options: INodePropertyOptions[] = [
			{ name: 'Engineering', value: 'team-eng' },
			{ name: 'Support', value: 'team-support', description: 'Support team' },
		];
		const { tool, dynamicNodeParametersService } = makeTool(
			makeNodeType({
				credentials: [{ name: 'linearOAuth2Api', required: true }],
				properties: [
					{
						displayName: 'Team Name or ID',
						name: 'teamId',
						type: 'options',
						default: '',
						typeOptions: { loadOptionsMethod: 'getTeams' },
					},
				],
			}),
		);
		dynamicNodeParametersService.getOptionsViaMethodName.mockResolvedValue(options);

		const credentials = {
			linearOAuth2Api: { id: 'cred-1', name: 'Linear' },
		};
		const nodeParameters = { resource: 'issue', operation: 'create' };
		const result = await tool.handler!(
			{
				nodeType: 'n8n-nodes-base.linearTool',
				nodeTypeVersion: 1,
				parameterPath: 'teamId',
				nodeParameters,
				credentials,
			},
			ctx,
		);

		expect(dynamicNodeParametersService.getOptionsViaMethodName).toHaveBeenCalledWith(
			'getTeams',
			'parameters.teamId',
			expect.any(Object),
			{ name: 'n8n-nodes-base.linearTool', version: 1 },
			nodeParameters,
			credentials,
		);
		expect(result).toEqual({
			ok: true,
			kind: 'loadOptionsMethod',
			parameterPath: 'teamId',
			methodName: 'getTeams',
			results: [
				{ name: 'Engineering', value: 'team-eng', parameterValue: 'team-eng' },
				{
					name: 'Support',
					value: 'team-support',
					description: 'Support team',
					parameterValue: 'team-support',
				},
			],
		});
	});

	it('loads resource locator options and returns RLC parameter values', async () => {
		const rlcResult: INodeListSearchResult = {
			results: [{ name: 'Roadmap', value: 'project-1', url: 'https://example.test/project-1' }],
		};
		const { tool, dynamicNodeParametersService } = makeTool(
			makeNodeType({
				properties: [
					{
						displayName: 'Project',
						name: 'projectId',
						type: 'resourceLocator',
						default: { __rl: true, mode: 'list', value: '' },
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								typeOptions: { searchListMethod: 'searchProjects' },
							},
						],
					},
				],
			}),
		);
		dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue(rlcResult);

		const result = await tool.handler!(
			{
				nodeType: 'n8n-nodes-base.projectTool',
				nodeTypeVersion: 1,
				parameterPath: 'projectId',
			},
			ctx,
		);

		expect(dynamicNodeParametersService.getResourceLocatorResults).toHaveBeenCalledWith(
			'searchProjects',
			'parameters.projectId',
			expect.any(Object),
			{ name: 'n8n-nodes-base.projectTool', version: 1 },
			{},
			undefined,
			undefined,
			undefined,
		);
		expect(result).toEqual({
			ok: true,
			kind: 'resourceLocator',
			parameterPath: 'projectId',
			methodName: 'searchProjects',
			mode: 'list',
			results: [
				{
					name: 'Roadmap',
					value: 'project-1',
					url: 'https://example.test/project-1',
					parameterValue: {
						__rl: true,
						mode: 'list',
						value: 'project-1',
						cachedResultName: 'Roadmap',
						cachedResultUrl: 'https://example.test/project-1',
					},
				},
			],
			paginationToken: undefined,
		});
	});

	it('auto-detects the authentication parameter from the credential type', async () => {
		const { tool, dynamicNodeParametersService } = makeTool(
			makeNodeType({
				credentials: [
					{
						name: 'googleSheetsOAuth2Api',
						required: true,
						displayOptions: { show: { authentication: ['oAuth2'] } },
					},
					{
						name: 'googleApi',
						required: true,
						displayOptions: { show: { authentication: ['serviceAccount'] } },
					},
				],
				properties: [
					{
						displayName: 'Authentication',
						name: 'authentication',
						type: 'options',
						default: 'oAuth2',
						options: [
							{ name: 'OAuth2', value: 'oAuth2' },
							{ name: 'Service Account', value: 'serviceAccount' },
						],
					},
					{
						displayName: 'Sheet Name or ID',
						name: 'sheetId',
						type: 'options',
						default: '',
						typeOptions: { loadOptionsMethod: 'getSheets' },
					},
				],
			}),
		);
		dynamicNodeParametersService.getOptionsViaMethodName.mockResolvedValue([]);

		await tool.handler!(
			{
				nodeType: 'n8n-nodes-base.googleSheetsTool',
				nodeTypeVersion: 1,
				parameterPath: 'sheetId',
				credentials: { googleApi: { id: 'cred-1', name: 'Google Service Account' } },
			},
			ctx,
		);

		expect(dynamicNodeParametersService.getOptionsViaMethodName).toHaveBeenCalledWith(
			'getSheets',
			'parameters.sheetId',
			expect.any(Object),
			{ name: 'n8n-nodes-base.googleSheetsTool', version: 1 },
			{ authentication: 'serviceAccount' },
			{ googleApi: { id: 'cred-1', name: 'Google Service Account' } },
		);
	});

	it('keeps an explicitly provided authentication parameter', async () => {
		const { tool, dynamicNodeParametersService } = makeTool(
			makeNodeType({
				credentials: [
					{
						name: 'googleSheetsOAuth2Api',
						required: true,
						displayOptions: { show: { authentication: ['oAuth2'] } },
					},
				],
				properties: [
					{
						displayName: 'Authentication',
						name: 'authentication',
						type: 'options',
						default: 'oAuth2',
						options: [{ name: 'OAuth2', value: 'oAuth2' }],
					},
					{
						displayName: 'Sheet Name or ID',
						name: 'sheetId',
						type: 'options',
						default: '',
						typeOptions: { loadOptionsMethod: 'getSheets' },
					},
				],
			}),
		);
		dynamicNodeParametersService.getOptionsViaMethodName.mockResolvedValue([]);

		await tool.handler!(
			{
				nodeType: 'n8n-nodes-base.googleSheetsTool',
				nodeTypeVersion: 1,
				parameterPath: 'sheetId',
				nodeParameters: { authentication: 'customAuth' },
				credentials: { googleSheetsOAuth2Api: { id: 'cred-1', name: 'Google Sheets' } },
			},
			ctx,
		);

		expect(dynamicNodeParametersService.getOptionsViaMethodName).toHaveBeenCalledWith(
			'getSheets',
			'parameters.sheetId',
			expect.any(Object),
			{ name: 'n8n-nodes-base.googleSheetsTool', version: 1 },
			{ authentication: 'customAuth' },
			{ googleSheetsOAuth2Api: { id: 'cred-1', name: 'Google Sheets' } },
		);
	});

	it('surfaces the property builderHint alongside results', async () => {
		const rlcResult: INodeListSearchResult = {
			results: [{ name: 'Roadmap', value: 'project-1' }],
		};
		const { tool, dynamicNodeParametersService } = makeTool(
			makeNodeType({
				properties: [
					{
						displayName: 'Project',
						name: 'projectId',
						type: 'resourceLocator',
						default: { __rl: true, mode: 'list', value: '' },
						builderHint: { propertyHint: 'Pick the project the user mentioned' },
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								typeOptions: { searchListMethod: 'searchProjects' },
							},
						],
					},
				],
			}),
		);
		dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue(rlcResult);

		const result = await tool.handler!(
			{
				nodeType: 'n8n-nodes-base.projectTool',
				nodeTypeVersion: 1,
				parameterPath: 'projectId',
			},
			ctx,
		);

		expect(result).toMatchObject({
			ok: true,
			builderHint: 'Pick the project the user mentioned',
		});
	});
});
