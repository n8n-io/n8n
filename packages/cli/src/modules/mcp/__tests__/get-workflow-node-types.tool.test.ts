import type { AiGatewayConfigDto } from '@n8n/api-types';
import { User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { NodeCatalogService } from '@/node-catalog';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { Telemetry } from '@/telemetry';

import { createGetWorkflowNodeTypesTool } from '../tools/workflow-builder/get-workflow-node-types.tool';

vi.mock('@n8n/ai-workflow-builder', () => ({
	CODE_BUILDER_GET_NODE_TYPES_TOOL: {
		toolName: 'get_workflow_node_types',
		displayTitle: 'Get workflow node types',
	},
	CODE_BUILDER_SEARCH_NODES_TOOL: { toolName: 'search', displayTitle: 'Search' },
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL: { toolName: 'suggest', displayTitle: 'Suggest' },
	CODE_BUILDER_VALIDATE_TOOL: { toolName: 'validate', displayTitle: 'Validate' },
	MCP_GET_SDK_REFERENCE_TOOL: { toolName: 'sdk_ref', displayTitle: 'SDK Ref' },
	MCP_CREATE_WORKFLOW_FROM_CODE_TOOL: { toolName: 'create', displayTitle: 'Create' },
	MCP_ARCHIVE_WORKFLOW_TOOL: { toolName: 'archive', displayTitle: 'Archive' },
	MCP_UPDATE_WORKFLOW_TOOL: { toolName: 'update', displayTitle: 'Update' },
}));

describe('get-workflow-node-types MCP tool', () => {
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
		nodeCatalogService.getNodeTypes.mockResolvedValue('typescript definitions');
	});

	const createTool = () =>
		createGetWorkflowNodeTypesTool(user, nodeCatalogService, telemetry, aiGatewayService);

	test('returns definitions verbatim', async () => {
		const tool = createTool();
		const result = await tool.handler(
			{ nodeIds: [{ nodeId: 'n8n-nodes-base.gmail' }] },
			{} as never,
		);
		expect(result.structuredContent).toEqual({ definitions: 'typescript definitions' });
	});

	test('adds n8nConnect block when gateway is available', async () => {
		aiGatewayService.isAvailable.mockResolvedValue({
			available: true,
			config: {
				nodes: ['@n8n/n8n-nodes-langchain.openAi'],
				credentialTypes: ['openAiApi'],
				providerConfig: {},
			} as AiGatewayConfigDto,
		});

		const tool = createTool();
		const result = await tool.handler(
			{ nodeIds: [{ nodeId: '@n8n/n8n-nodes-langchain.openAi' }] },
			{} as never,
		);

		expect(result.structuredContent).toEqual({
			definitions: 'typescript definitions',
			n8nConnect: {
				credentialTypes: ['openAiApi'],
				nodes: ['@n8n/n8n-nodes-langchain.openAi'],
			},
		});
		// Also mirrored into the unstructured content for text-only clients.
		expect((result.content[0] as { text: string }).text).toBe(
			'typescript definitions\n\nn8nConnect: {"credentialTypes":["openAiApi"],"nodes":["@n8n/n8n-nodes-langchain.openAi"]}',
		);
	});

	test('omits n8nConnect block when unavailable', async () => {
		const tool = createTool();
		const result = await tool.handler(
			{ nodeIds: [{ nodeId: 'n8n-nodes-base.slack' }] },
			{} as never,
		);
		expect(result.structuredContent).toEqual({ definitions: 'typescript definitions' });
		expect((result.content[0] as { text: string }).text).toBe('typescript definitions');
	});
});
