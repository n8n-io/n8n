import type { User } from '@n8n/db';
import z from 'zod';

import type { NodeCatalogService } from '@/node-catalog';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { Telemetry } from '@/telemetry';

import { CODE_BUILDER_GET_NODE_TYPES_TOOL } from './constants';
import { toAiGatewayCoverage } from '../../mcp-ai-gateway.helper';
import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type {
	AiGatewayCoverage,
	ToolDefinition,
	UserCalledMCPToolEventPayload,
} from '../../mcp.types';

const nodeRequestSchema = z.object({
	nodeId: z.string().describe('The node type ID (e.g. "n8n-nodes-base.gmail")'),
	version: z.string().optional().describe('Specific version (e.g. "2.1")'),
	resource: z.string().optional().describe('Resource discriminator (e.g. "message")'),
	operation: z.string().optional().describe('Operation discriminator (e.g. "send")'),
	mode: z.string().optional().describe('Mode discriminator'),
});

const inputSchema = {
	nodeIds: z
		.array(nodeRequestSchema)
		.min(1)
		.describe(
			'Node type requests to get definitions for. Always pass an array of objects, even for a single node. Include discriminators from search_nodes results when available.',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	definitions: z.string().describe('TypeScript type definitions for the requested nodes'),
	aiGateway: z
		.object({
			credentialTypes: z.array(z.string()).describe('Credential types n8n Connect can provide.'),
			nodes: z
				.array(z.string())
				.describe(
					'Node types n8n Connect covers. Prefer these when the user has not specified an integration — they let the workflow run without credential setup.',
				),
		})
		.optional()
		.describe(
			'Present when n8n Connect ("AI Gateway") is available. Cross-reference against the returned node types to know which will get free credentials via Connect.',
		),
} satisfies z.ZodRawShape;

type NodeRequest = z.infer<typeof nodeRequestSchema>;

/**
 * MCP tool that retrieves TypeScript type definitions for n8n nodes.
 * Returns exact parameter definitions needed to configure nodes correctly.
 */
export const createGetWorkflowNodeTypesTool = (
	user: User,
	nodeCatalogService: NodeCatalogService,
	telemetry: Telemetry,
	aiGatewayService: AiGatewayService,
): ToolDefinition<typeof inputSchema> => ({
	name: CODE_BUILDER_GET_NODE_TYPES_TOOL.toolName,
	config: {
		description:
			'Get TypeScript type definitions for n8n nodes. Returns exact parameter names and structures. MUST be called before writing workflow code — guessing parameter names creates invalid workflows. Pass nodeIds as an array of objects like { nodeId: "n8n-nodes-base.gmail" }. Include discriminators (resource/operation/mode) from search_nodes results.',
		inputSchema,
		outputSchema,
		annotations: {
			title: CODE_BUILDER_GET_NODE_TYPES_TOOL.displayTitle,
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ nodeIds }: { nodeIds: NodeRequest[] }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: CODE_BUILDER_GET_NODE_TYPES_TOOL.toolName,
			parameters: { nodeIdCount: nodeIds.length },
		};

		try {
			const [result, availability] = await Promise.all([
				nodeCatalogService.getNodeTypes(nodeIds),
				aiGatewayService.isAvailable(),
			]);

			telemetryPayload.results = { success: true, data: { nodeIdCount: nodeIds.length } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const structured: {
				definitions: string;
				aiGateway?: AiGatewayCoverage;
			} = { definitions: result };
			const coverage = toAiGatewayCoverage(availability);
			if (coverage) structured.aiGateway = coverage;

			return {
				content: [{ type: 'text', text: result }],
				structuredContent: structured,
			};
		} catch (error) {
			telemetryPayload.results = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});
