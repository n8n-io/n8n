import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const moveWorkflowToFolderInputSchema = z.object({
	workflowId: z.string().describe('ID of the workflow to move'),
	workflowName: z.string().optional().describe('Name of the workflow (for confirmation message)'),
	folderId: z.string().describe('ID of the destination folder'),
	folderName: z
		.string()
		.optional()
		.describe('Name of the destination folder (for confirmation message)'),
});

export const moveWorkflowToFolderResumeSchema = z.object({
	approved: z.boolean(),
});

export function createMoveWorkflowToFolderTool(context: InstanceAiContext) {
	return createTool({
		id: 'move-workflow-to-folder',
		description: 'Move a workflow into a folder. Non-destructive — the workflow is not modified.',
		inputSchema: moveWorkflowToFolderInputSchema,
		outputSchema: z.object({
			success: z.boolean(),
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: moveWorkflowToFolderResumeSchema,
		execute: async (input: z.infer<typeof moveWorkflowToFolderInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof moveWorkflowToFolderResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			if (context.permissions?.moveWorkflowToFolder === 'blocked') {
				return { success: false, denied: true, reason: 'Action blocked by admin' };
			}

			const needsApproval = context.permissions?.moveWorkflowToFolder !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Move workflow "${input.workflowName ?? input.workflowId}" to folder "${input.folderName ?? input.folderId}"?`,
					severity: 'info' as const,
				});
				// suspend() never resolves — this line is unreachable but satisfies the type checker
				return { success: false };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			await context.workspaceService!.moveWorkflowToFolder!(input.workflowId, input.folderId);
			return { success: true };
		},
	});
}
