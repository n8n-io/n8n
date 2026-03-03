import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

import type { Telemetry } from '@/telemetry';

import type { WorkflowBuilderToolsService } from './workflow-builder-tools.service';

const inputSchema = {
	queries: z
		.array(z.string())
		.min(1)
		.describe(
			'Search queries for n8n nodes — service names (e.g. "gmail", "slack"), trigger types (e.g. "schedule trigger", "webhook"), or utility nodes (e.g. "set", "if", "merge", "code")',
		),
} satisfies z.ZodRawShape;

/**
 * MCP tool that searches for n8n nodes by keyword.
 * Wraps the code-builder's search tool.
 */
export const createSearchWorkflowNodesTool = (
	user: User,
	workflowBuilderToolsService: WorkflowBuilderToolsService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'n8n_search_workflow_nodes',
	config: {
		description:
			'Search for n8n nodes by service name, trigger type, or utility function. Returns node IDs, discriminators (resource/operation/mode), and related nodes needed for get_workflow_node_types.',
		inputSchema,
		annotations: {
			title: 'Search Workflow Nodes',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ queries }: { queries: string[] }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'n8n_search_workflow_nodes',
			parameters: { queries },
		};

		try {
			const { createCodeBuilderSearchTool } = await import('@n8n/ai-workflow-builder');
			const nodeTypeParser = workflowBuilderToolsService.getNodeTypeParser();
			const searchTool = createCodeBuilderSearchTool(nodeTypeParser);
			const result = await searchTool.invoke({ queries });

			telemetryPayload.results = { success: true, data: { queryCount: queries.length } };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: result }],
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
