import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { MCP_DELETE_WORKFLOW_TOOL } from './constants';

import type { Telemetry } from '@/telemetry';
import type { WorkflowService } from '@/workflows/workflow.service';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to delete'),
} satisfies z.ZodRawShape;

/**
 * MCP tool that deletes (archives) a workflow in n8n by ID.
 */
export const createDeleteWorkflowTool = (
	user: User,
	workflowService: WorkflowService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_DELETE_WORKFLOW_TOOL.toolName,
	config: {
		description: 'Delete (archive) a workflow in n8n by its ID.',
		inputSchema,
		annotations: {
			title: MCP_DELETE_WORKFLOW_TOOL.displayTitle,
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowId }: { workflowId: string }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_DELETE_WORKFLOW_TOOL.toolName,
			parameters: { workflowId },
		};

		try {
			const workflow = await workflowService.archive(user, workflowId, { skipArchived: true });

			if (!workflow) {
				throw new Error("Workflow not found or you don't have permission to delete it.");
			}

			telemetryPayload.results = {
				success: true,
				data: { workflowId },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								deleted: true,
								workflowId,
								name: workflow.name,
							},
							null,
							2,
						),
					},
				],
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({ error: errorMessage }, null, 2),
					},
				],
				isError: true,
			};
		}
	},
});
