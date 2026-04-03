import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

import type { Telemetry } from '@/telemetry';

import { CODE_BUILDER_GET_NODE_TYPES_TOOL } from './constants';
import type { WorkflowBuilderToolsService } from './workflow-builder-tools.service';

const nodeIdWithDiscriminators = z.object({
	nodeId: z.string().describe('The node type ID (e.g. "n8n-nodes-base.gmail")'),
	version: z.string().optional().describe('Specific version (e.g. "2.1")'),
	resource: z.string().optional().describe('Resource discriminator (e.g. "message")'),
	operation: z.string().optional().describe('Operation discriminator (e.g. "send")'),
	mode: z.string().optional().describe('Mode discriminator'),
});

const inputSchema = {
	nodeIds: z
		.array(z.union([z.string(), nodeIdWithDiscriminators]))
		.min(1)
		.describe(
			'Node IDs to get type definitions for. Use plain strings for simple nodes, or objects with discriminators from search results.',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	definitions: z.string().describe('TypeScript type definitions for the requested nodes'),
} satisfies z.ZodRawShape;

type NodeRequest =
	| string
	| {
			nodeId: string;
			version?: string;
			resource?: string;
			operation?: string;
			mode?: string;
	  };

/**
 * MCP tool that retrieves TypeScript type definitions for n8n nodes.
 * Returns exact parameter definitions needed to configure nodes correctly.
 */
export const createGetWorkflowNodeTypesTool = (
	user: User,
	workflowBuilderToolsService: WorkflowBuilderToolsService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: CODE_BUILDER_GET_NODE_TYPES_TOOL.toolName,
	config: {
		description:
			'Get TypeScript type definitions for n8n nodes. Returns exact parameter names and structures. MUST be called before writing workflow code — guessing parameter names creates invalid workflows. Include discriminators (resource/operation/mode) from search results.',
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
			const result = await workflowBuilderToolsService.getNodeTypes(nodeIds);

			telemetryPayload.results = { success: true, data: { nodeIdCount: nodeIds.length } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: result }],
				structuredContent: { definitions: result },
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
