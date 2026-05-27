import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

import type { NodeCatalogService } from '@/node-catalog';
import type { Telemetry } from '@/telemetry';

import { CODE_BUILDER_GET_SUGGESTED_NODES_TOOL } from './constants';

const inputSchema = {
	categories: z
		.array(z.string())
		.min(1)
		.describe(
			'Workflow technique categories. Available: chatbot, notification, scheduling, data_transformation, data_persistence, data_extraction, document_processing, form_input, content_generation, triage, scraping_and_research',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	suggestions: z
		.string()
		.describe('Curated node recommendations with pattern hints and configuration guidance'),
} satisfies z.ZodRawShape;

/**
 * MCP tool that returns curated node recommendations by workflow technique category.
 */
export const createGetSuggestedWorkflowNodesTool = (
	user: User,
	nodeCatalogService: NodeCatalogService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: CODE_BUILDER_GET_SUGGESTED_NODES_TOOL.toolName,
	config: {
		description:
			'Required workflow-planning step. Get curated node recommendations for workflow technique categories before searching for nodes or writing code. Returns recommended nodes with pattern hints and configuration guidance.',
		inputSchema,
		outputSchema,
		annotations: {
			title: CODE_BUILDER_GET_SUGGESTED_NODES_TOOL.displayTitle,
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ categories }: { categories: string[] }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: CODE_BUILDER_GET_SUGGESTED_NODES_TOOL.toolName,
			parameters: { categories },
		};

		try {
			const result = await nodeCatalogService.getSuggestedNodes(categories);

			telemetryPayload.results = {
				success: true,
				data: { categoryCount: categories.length },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: result }],
				structuredContent: { suggestions: result },
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
