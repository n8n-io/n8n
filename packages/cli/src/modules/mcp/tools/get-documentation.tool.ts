import { type User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

import { documentation } from '@n8n/ai-workflow-builder';

import type { Telemetry } from '@/telemetry';

const techniqueTypes = [
	'scraping_and_research',
	'chatbot',
	'content_generation',
	'data_analysis',
	'data_extraction',
	'data_persistence',
	'data_transformation',
	'document_processing',
	'enrichment',
	'form_input',
	'knowledge_base',
	'notification',
	'triage',
	'human_in_the_loop',
	'monitoring',
	'scheduling',
] as const;

const inputSchema = {
	techniques: z
		.array(z.enum(techniqueTypes))
		.describe('List of workflow technique types to get documentation for'),
} satisfies z.ZodRawShape;

export const createGetDocumentationTool = (
	user: User,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'get_documentation',
	config: {
		description:
			'Get best practices documentation for specific workflow techniques. Use this to understand recommended patterns before building workflows.',
		inputSchema,
		annotations: {
			title: 'Get Documentation',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ techniques }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'get_documentation',
			parameters: { techniques },
		};

		try {
			const results: Array<{ technique: string; content: string | null }> = [];

			for (const technique of techniques) {
				const doc = documentation[technique];
				results.push({
					technique,
					content: doc ? doc.getDocumentation() : null,
				});
			}

			const payload = { documentation: results };

			telemetryPayload.results = {
				success: true,
				data: { technique_count: techniques.length },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
				structuredContent: payload,
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
