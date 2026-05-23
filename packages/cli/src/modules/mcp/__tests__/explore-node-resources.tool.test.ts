import { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createExploreNodeResourcesTool } from '../tools/workflow-builder/explore-node-resources.tool';

import type { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';
import type { Telemetry } from '@/telemetry';

jest.mock('@n8n/ai-workflow-builder', () => ({
	CODE_BUILDER_SEARCH_NODES_TOOL: { toolName: 'search_nodes', displayTitle: 'Search' },
	CODE_BUILDER_GET_NODE_TYPES_TOOL: { toolName: 'get_node_types', displayTitle: 'Get' },
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL: { toolName: 'get_suggested', displayTitle: 'Suggest' },
	CODE_BUILDER_VALIDATE_TOOL: { toolName: 'validate_workflow_code', displayTitle: 'Validate' },
	MCP_GET_SDK_REFERENCE_TOOL: { toolName: 'sdk_ref', displayTitle: 'SDK Ref' },
	MCP_CREATE_WORKFLOW_FROM_CODE_TOOL: { toolName: 'create_workflow', displayTitle: 'Create' },
	MCP_ARCHIVE_WORKFLOW_TOOL: { toolName: 'archive_workflow', displayTitle: 'Archive' },
	MCP_UPDATE_WORKFLOW_TOOL: { toolName: 'update_workflow', displayTitle: 'Update' },
	MCP_EXPLORE_NODE_RESOURCES_TOOL: {
		toolName: 'explore_node_resources',
		displayTitle: 'Exploring node resources',
	},
}));

describe('explore-node-resources MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let nodeResourceExplorerService: jest.Mocked<NodeResourceExplorerService>;
	let telemetry: jest.Mocked<Telemetry>;

	beforeEach(() => {
		jest.clearAllMocks();
		nodeResourceExplorerService = mock<NodeResourceExplorerService>();
		telemetry = mock<Telemetry>();
	});

	const createTool = () =>
		createExploreNodeResourcesTool(user, nodeResourceExplorerService, telemetry);

	const baseInput = {
		nodeType: 'n8n-nodes-base.slack',
		version: 2.3,
		methodName: 'getChannels',
		methodType: 'listSearch' as const,
		credentialType: 'slackApi',
		credentialId: 'cred-1',
		filter: undefined,
		paginationToken: undefined,
		currentNodeParameters: undefined,
	};

	test('delegates to the service and returns results with text + structured content', async () => {
		nodeResourceExplorerService.exploreResources.mockResolvedValue({
			results: [
				{ name: '#general', value: 'C123' },
				{ name: '#random', value: 'C456' },
			],
			paginationToken: 'next-page',
			builderHint: 'Pick a public channel',
		});

		const tool = createTool();
		const result = await tool.handler(baseInput, {} as never);

		expect(nodeResourceExplorerService.exploreResources).toHaveBeenCalledWith(user, {
			nodeType: 'n8n-nodes-base.slack',
			version: 2.3,
			methodName: 'getChannels',
			methodType: 'listSearch',
			credentialType: 'slackApi',
			credentialId: 'cred-1',
			filter: undefined,
			paginationToken: undefined,
			currentNodeParameters: undefined,
		});

		expect(result.structuredContent).toEqual({
			results: [
				{ name: '#general', value: 'C123' },
				{ name: '#random', value: 'C456' },
			],
			paginationToken: 'next-page',
			builderHint: 'Pick a public channel',
		});
		expect(result.content).toEqual([
			{ type: 'text', text: JSON.stringify(result.structuredContent) },
		]);
	});

	test('forwards filter, paginationToken, and currentNodeParameters when provided', async () => {
		nodeResourceExplorerService.exploreResources.mockResolvedValue({ results: [] });

		const tool = createTool();
		await tool.handler(
			{
				...baseInput,
				filter: 'general',
				paginationToken: 'tok',
				currentNodeParameters: { documentId: 'sheet-1' },
			},
			{} as never,
		);

		expect(nodeResourceExplorerService.exploreResources).toHaveBeenCalledWith(
			user,
			expect.objectContaining({
				filter: 'general',
				paginationToken: 'tok',
				currentNodeParameters: { documentId: 'sheet-1' },
			}),
		);
	});

	test('tracks telemetry on success with non-sensitive parameter summary', async () => {
		nodeResourceExplorerService.exploreResources.mockResolvedValue({
			results: [{ name: 'a', value: '1' }],
			paginationToken: 'p',
			builderHint: 'h',
		});

		const tool = createTool();
		await tool.handler({ ...baseInput, filter: 'g' }, {} as never);

		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'explore_node_resources',
				parameters: {
					nodeType: 'n8n-nodes-base.slack',
					version: 2.3,
					methodName: 'getChannels',
					methodType: 'listSearch',
					credentialType: 'slackApi',
					hasFilter: true,
					hasPaginationToken: false,
					hasCurrentNodeParameters: false,
				},
				results: {
					success: true,
					data: {
						resultCount: 1,
						hasPaginationToken: true,
						hasBuilderHint: true,
					},
				},
			}),
		);
	});

	test('omits the credentialId from telemetry parameters', async () => {
		nodeResourceExplorerService.exploreResources.mockResolvedValue({ results: [] });

		const tool = createTool();
		await tool.handler(baseInput, {} as never);

		const payload = telemetry.track.mock.calls[0][1] as { parameters: Record<string, unknown> };
		expect(payload.parameters).not.toHaveProperty('credentialId');
	});

	test('tracks telemetry on failure and rethrows', async () => {
		nodeResourceExplorerService.exploreResources.mockRejectedValueOnce(
			new Error('Credential cred-1 not found or not accessible'),
		);

		const tool = createTool();
		await expect(tool.handler(baseInput, {} as never)).rejects.toThrow(
			'Credential cred-1 not found or not accessible',
		);

		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'explore_node_resources',
				results: {
					success: false,
					error: 'Credential cred-1 not found or not accessible',
				},
			}),
		);
	});
});
