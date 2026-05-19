import type { User } from '@n8n/db';
import { jsonStringify, ensureError } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { getMcpWorkflow } from './workflow-validation.utils';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to unpublish'),
});

type UnpublishWorkflowOutput = {
	success: boolean;
	workflowId: string;
	error?: string;
};

const outputSchema = {
	success: z.boolean(),
	workflowId: z.string(),
	error: z.string().optional(),
} satisfies z.ZodRawShape;

export const createUnpublishWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowService: WorkflowService,
	telemetry: Telemetry,
	collaborationService: CollaborationService,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'unpublish_workflow',
	config: {
		description:
			'Unpublish (deactivate) a workflow to stop it from being available for production execution.',
		inputSchema: inputSchema.shape,
		outputSchema,
		annotations: {
			title: 'Unpublish Workflow',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowId }: z.infer<typeof inputSchema>) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'unpublish_workflow',
			parameters: { workflowId },
		};

		try {
			await getMcpWorkflow(workflowId, user, ['workflow:unpublish'], workflowFinderService);

			await collaborationService.ensureWorkflowEditable(workflowId);

			await workflowService.deactivateWorkflow(user, workflowId, {
				source: 'n8n-mcp',
			});

			void collaborationService.broadcastWorkflowUpdate(workflowId, user.id).catch(() => {});

			const output: UnpublishWorkflowOutput = {
				success: true,
				workflowId,
			};

			telemetryPayload.results = {
				success: true,
				data: {
					workflow_id: workflowId,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		} catch (er) {
			const error = ensureError(er);
			const isAccessError = error instanceof WorkflowAccessError;

			const output: UnpublishWorkflowOutput = {
				success: false,
				workflowId,
				error: error.message,
			};

			telemetryPayload.results = {
				success: false,
				error: error.message,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		}
	},
});
