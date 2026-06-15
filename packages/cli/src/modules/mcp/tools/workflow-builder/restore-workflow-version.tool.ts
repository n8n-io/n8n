import { type User, WorkflowEntity } from '@n8n/db';
import { ensureError } from 'n8n-workflow';
import z from 'zod';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import { WorkflowAccessError } from '../../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { getMcpWorkflowVersion } from '../workflow-history.utils';
import { getMcpWorkflow } from '../workflow-validation.utils';

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to restore'),
	versionId: z.string().describe('The version ID to restore, as returned by get_workflow_history'),
});

type RestoreWorkflowVersionOutput = {
	success: boolean;
	workflowId: string;
	restoredFromVersionId: string;
	newVersionId: string | null;
	error?: string;
};

const outputSchema = {
	success: z.boolean(),
	workflowId: z.string(),
	restoredFromVersionId: z.string(),
	newVersionId: z
		.string()
		.nullable()
		.describe('The new current version ID created by the restore, if successful'),
	error: z.string().optional(),
} satisfies z.ZodRawShape;

/**
 * MCP tool that restores a workflow to a previous version from its history. It
 * re-applies the version's nodes/connections/node groups as the current draft
 * via WorkflowService.update with forceSave, exactly like the editor's restore.
 * The update creates a fresh history entry; the version restored from is left
 * unchanged.
 */
export const createRestoreWorkflowVersionTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowHistoryService: WorkflowHistoryService,
	workflowService: WorkflowService,
	telemetry: Telemetry,
	collaborationService: CollaborationService,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'restore_workflow_version',
	config: {
		description:
			'Restore a workflow to a previous version from its history. Re-applies that version as the current draft and records a new history entry. Use get_workflow_history to find the versionId.',
		inputSchema: inputSchema.shape,
		outputSchema,
		annotations: {
			title: 'Restore Workflow Version',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowId, versionId }: z.infer<typeof inputSchema>) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'restore_workflow_version',
			parameters: { workflowId, versionId },
		};

		try {
			const existingWorkflow = await getMcpWorkflow(
				workflowId,
				user,
				['workflow:update'],
				workflowFinderService,
			);

			await collaborationService.ensureWorkflowEditable(existingWorkflow.id);

			const version = await getMcpWorkflowVersion(
				workflowHistoryService,
				user,
				workflowId,
				versionId,
			);

			const workflowUpdateData = new WorkflowEntity();
			Object.assign(workflowUpdateData, {
				nodes: version.nodes,
				connections: version.connections,
				nodeGroups: version.nodeGroups ?? [],
			});

			const updatedWorkflow = await workflowService.update(user, workflowUpdateData, workflowId, {
				forceSave: true,
				source: 'n8n-mcp',
			});

			void collaborationService.broadcastWorkflowUpdate(workflowId, user.id).catch(() => {});

			const output: RestoreWorkflowVersionOutput = {
				success: true,
				workflowId: updatedWorkflow.id,
				restoredFromVersionId: versionId,
				newVersionId: updatedWorkflow.versionId,
			};

			telemetryPayload.results = {
				success: true,
				data: {
					workflow_id: workflowId,
					restored_from_version_id: versionId,
					new_version_id: updatedWorkflow.versionId,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (er) {
			const error = ensureError(er);
			const isAccessError = error instanceof WorkflowAccessError;

			const output: RestoreWorkflowVersionOutput = {
				success: false,
				workflowId,
				restoredFromVersionId: versionId,
				newVersionId: null,
				error: error.message,
			};

			telemetryPayload.results = {
				success: false,
				error: error.message,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
