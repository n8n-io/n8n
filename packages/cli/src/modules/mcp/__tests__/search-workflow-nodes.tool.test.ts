import type { AiGatewayConfigDto } from '@n8n/api-types';
import { User } from '@n8n/db';
import z from 'zod';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { NodeCatalogService } from '@/node-catalog';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createSearchWorkflowNodesTool } from '../tools/workflow-builder/search-workflow-nodes.tool';

vi.mock('@n8n/ai-workflow-builder', () => ({
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
	let nodeCatalogService: Mocked<NodeCatalogService>;
	let telemetry: Mocked<Telemetry>;
	let aiGatewayService: Mocked<AiGatewayService>;

	beforeEach(() => {
		vi.clearAllMocks();
		nodeCatalogService = mock<NodeCatalogService>();
		telemetry = mock<Telemetry>();
		aiGatewayService = mock<AiGatewayService>();
		aiGatewayService.isAvailable.mockResolvedValue({ available: false });
		nodeCatalogService.searchNodes.mockResolvedValue({
			results: 'search-result',
			items: [
				{
					queryIndex: 0,
					query: 'gmail',
					nodeType: 'n8n-nodes-base.gmail',
					displayName: 'Gmail',
					package: 'n8n-nodes-base',
					versions: [2, 2.1],
					groups: ['communication'],
					isTrigger: false,
					relation: 'primary',
				},
			],
			queriesWithNoResults: [],
		});
	});

	const createTool = () =>
		createSearchWorkflowNodesTool(user, nodeCatalogService, telemetry, aiGatewayService);

	test('preserves the existing tool name and input schema', () => {
		const tool = createTool();

		expect(tool.name).toBe('search_workflow_nodes');
		expect(Object.keys(tool.config.inputSchema ?? {})).toEqual(['queries']);
	});

	test('returns search results and tracks queries with no results', async () => {
		nodeCatalogService.searchNodes.mockResolvedValueOnce({
			results: 'search-result',
			items: [
				{
					queryIndex: 0,
					query: 'gmail',
					nodeType: 'n8n-nodes-base.gmail',
					relation: 'primary',
				},
			],
			queriesWithNoResults: ['missing-node'],
		});

		const tool = createTool();
		const result = await tool.handler({ queries: ['gmail', 'missing-node'] }, {} as never);

		expect(nodeCatalogService.searchNodes).toHaveBeenCalledWith(['gmail', 'missing-node']);
		expect(result.content).toEqual([{ type: 'text', text: 'search-result' }]);
		expect(result.structuredContent).toEqual({
			schemaVersion: '1.0',
			queries: ['gmail', 'missing-node'],
			count: 1,
			items: [
				{
					queryIndex: 0,
					query: 'gmail',
					nodeType: 'n8n-nodes-base.gmail',
					relation: 'primary',
				},
			],
			queriesWithNoResults: ['missing-node'],
			results: 'search-result',
		});
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

	test('declares and returns a strict structured output contract', async () => {
		const tool = createTool();
		const result = await tool.handler({ queries: ['gmail'] }, {} as never);
		const strictSchema = z.object(tool.config.outputSchema as z.ZodRawShape).strict();

		expect(() => strictSchema.parse(result.structuredContent)).not.toThrow();
		expect(result.structuredContent).toMatchObject({
			schemaVersion: '1.0',
			queries: ['gmail'],
			count: 1,
			queriesWithNoResults: [],
			results: 'search-result',
		});
	});

	test('preserves legacy content and legacy structured fields byte-for-byte', async () => {
		const tool = createTool();
		const result = await tool.handler({ queries: ['gmail'] }, {} as never);

		expect(result.content).toEqual([{ type: 'text', text: 'search-result' }]);
		expect(result.structuredContent?.results).toBe('search-result');
		expect(result.structuredContent?.n8nConnect).toBeUndefined();
	});

	test('preserves duplicate query order and reports an empty result set exactly', async () => {
		nodeCatalogService.searchNodes.mockResolvedValueOnce({
			results: 'no-results',
			items: [],
			queriesWithNoResults: ['missing', 'missing'],
		});
		const tool = createTool();

		const result = await tool.handler({ queries: ['missing', 'missing'] }, {} as never);

		expect(result.structuredContent).toMatchObject({
			queries: ['missing', 'missing'],
			count: 0,
			items: [],
			queriesWithNoResults: ['missing', 'missing'],
		});
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

	describe('n8nConnect block', () => {
		test('includes n8nConnect block when gateway is available', async () => {
			nodeCatalogService.searchNodes.mockResolvedValueOnce({
				results: 'search-result',
				items: [
					{
						queryIndex: 0,
						query: 'openai',
						nodeType: '@n8n/n8n-nodes-langchain.openAi',
						relation: 'primary',
					},
				],
				queriesWithNoResults: [],
			});
			aiGatewayService.isAvailable.mockResolvedValue({
				available: true,
				config: {
					nodes: ['@n8n/n8n-nodes-langchain.openAi'],
					credentialTypes: ['openAiApi'],
					providerConfig: {},
				} as AiGatewayConfigDto,
			});

			const tool = createTool();
			const result = await tool.handler({ queries: ['openai'] }, {} as never);

			expect(result.structuredContent).toEqual({
				schemaVersion: '1.0',
				queries: ['openai'],
				count: 1,
				items: [
					{
						queryIndex: 0,
						query: 'openai',
						nodeType: '@n8n/n8n-nodes-langchain.openAi',
						relation: 'primary',
					},
				],
				queriesWithNoResults: [],
				results: 'search-result',
				n8nConnect: {
					credentialTypes: ['openAiApi'],
					nodes: ['@n8n/n8n-nodes-langchain.openAi'],
				},
			});
			// Also mirrored into the unstructured content for text-only clients.
			expect((result.content[0] as { text: string }).text).toBe(
				'search-result\n\nn8nConnect: {"credentialTypes":["openAiApi"],"nodes":["@n8n/n8n-nodes-langchain.openAi"]}',
			);
		});

		test('omits n8nConnect block when unavailable', async () => {
			const tool = createTool();
			const result = await tool.handler({ queries: ['gmail'] }, {} as never);
			expect(result.structuredContent).toMatchObject({
				schemaVersion: '1.0',
				queries: ['gmail'],
				count: 1,
				queriesWithNoResults: [],
				results: 'search-result',
			});
			expect(result.structuredContent).not.toHaveProperty('n8nConnect');
			expect((result.content[0] as { text: string }).text).toBe('search-result');
		});
	});
});
