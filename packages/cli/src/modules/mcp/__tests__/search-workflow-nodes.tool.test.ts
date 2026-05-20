import { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createSearchWorkflowNodesTool } from '../tools/workflow-builder/search-workflow-nodes.tool';

import type { NodeCatalogService } from '@/node-catalog';
import type { Telemetry } from '@/telemetry';

jest.mock('@n8n/ai-workflow-builder', () => ({
	CODE_BUILDER_SEARCH_NODES_TOOL: {
		toolName: 'search_workflow_nodes',
		displayTitle: 'Search Workflow Nodes',
	},
	CODE_BUILDER_GET_NODE_TYPES_TOOL: { toolName: 'get', displayTitle: 'Get' },
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL: { toolName: 'suggest', displayTitle: 'Suggest' },
	CODE_BUILDER_VALIDATE_TOOL: { toolName: 'validate_workflow_code', displayTitle: 'Validate' },
	MCP_GET_SDK_REFERENCE_TOOL: { toolName: 'sdk_ref', displayTitle: 'SDK Ref' },
	MCP_CREATE_WORKFLOW_FROM_CODE_TOOL: {
		toolName: 'create_workflow_from_code',
		displayTitle: 'Create',
	},
	MCP_ARCHIVE_WORKFLOW_TOOL: { toolName: 'archive_workflow', displayTitle: 'Archive' },
	MCP_UPDATE_WORKFLOW_TOOL: { toolName: 'update_workflow', displayTitle: 'Update' },
}));

describe('search-workflow-nodes MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let nodeCatalogService: jest.Mocked<NodeCatalogService>;
	let telemetry: jest.Mocked<Telemetry>;

	beforeEach(() => {
		jest.clearAllMocks();
		nodeCatalogService = mock<NodeCatalogService>();
		telemetry = mock<Telemetry>();
		nodeCatalogService.searchNodes.mockResolvedValue({
			results: 'search-result',
			queriesWithNoResults: [],
		});
	});

	const createTool = () => createSearchWorkflowNodesTool(user, nodeCatalogService, telemetry);

	test('returns search results and tracks queries with no results', async () => {
		nodeCatalogService.searchNodes.mockResolvedValueOnce({
			results: 'search-result',
			queriesWithNoResults: ['missing-node'],
		});

		const tool = createTool();
		const result = await tool.handler({ queries: ['gmail', 'missing-node'] }, {} as never);

		expect(nodeCatalogService.searchNodes).toHaveBeenCalledWith(['gmail', 'missing-node']);
		expect(result.content).toEqual([{ type: 'text', text: 'search-result' }]);
		expect(result.structuredContent).toEqual({ results: 'search-result' });
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'search_workflow_nodes',
				parameters: { queries: ['gmail', 'missing-node'] },
				results: {
					success: true,
					data: {
						queryCount: 2,
						noResultQueryCount: 1,
						queriesWithNoResults: ['missing-node'],
					},
				},
			}),
		);
	});

	test('tracks empty no-result metadata when every query has results', async () => {
		const tool = createTool();
		await tool.handler({ queries: ['gmail'] }, {} as never);

		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				results: {
					success: true,
					data: {
						queryCount: 1,
						noResultQueryCount: 0,
						queriesWithNoResults: [],
					},
				},
			}),
		);
	});

	test('tracks telemetry on search failure', async () => {
		nodeCatalogService.searchNodes.mockRejectedValueOnce(new Error('Search failed'));

		const tool = createTool();
		await expect(tool.handler({ queries: ['gmail'] }, {} as never)).rejects.toThrow(
			'Search failed',
		);

		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'search_workflow_nodes',
				results: {
					success: false,
					error: 'Search failed',
				},
			}),
		);
	});
});
