import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

import type { Telemetry } from '@/telemetry';

import type { WorkflowBuilderToolsService } from './workflow-builder-tools.service';

const inputSchema = {
	categories: z
		.array(z.string())
		.min(1)
		.describe(
			'Workflow technique categories. Available: chatbot, notification, scheduling, data_transformation, data_persistence, data_extraction, document_processing, form_input, content_generation, triage, scraping_and_research',
		),
} satisfies z.ZodRawShape;

/**
 * MCP tool that returns curated node recommendations by workflow technique category.
 */
export const createGetSuggestedWorkflowNodesTool = (
	user: User,
	workflowBuilderToolsService: WorkflowBuilderToolsService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'n8n_get_suggested_workflow_nodes',
	config: {
		description:
			'Get curated node recommendations for workflow technique categories. Returns recommended nodes with pattern hints and configuration guidance. Use after analyzing what kind of workflow to build.',
		inputSchema,
		annotations: {
			title: 'Get Suggested Workflow Nodes',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ categories }: { categories: string[] }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'n8n_get_suggested_workflow_nodes',
			parameters: { categories },
		};

		try {
			const { createGetSuggestedNodesTool } = await import('@n8n/ai-workflow-builder');
			const nodeTypeParser = workflowBuilderToolsService.getNodeTypeParser();
			const suggestTool = createGetSuggestedNodesTool(nodeTypeParser);
			const result = await suggestTool.invoke({ categories });

			telemetryPayload.results = {
				success: true,
				data: { categoryCount: categories.length },
			};
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
