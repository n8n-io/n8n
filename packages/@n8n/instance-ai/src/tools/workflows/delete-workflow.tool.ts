import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const deleteWorkflowInputSchema = z.object({
	workflowId: z.string().describe('ID of the workflow to archive'),
	workflowName: z.string().optional().describe('Name of the workflow (for confirmation message)'),
});

export const deleteWorkflowResumeSchema = z.object({
	approved: z.boolean(),
});

export function createDeleteWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'delete-workflow',
		description:
			'Archive a workflow by ID. This is a soft delete that unpublishes the workflow if needed and can be undone later.',
		inputSchema: deleteWorkflowInputSchema,
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
		resumeSchema: deleteWorkflowResumeSchema,
		execute: async (input: z.infer<typeof deleteWorkflowInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof deleteWorkflowResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			if (context.permissions?.deleteWorkflow === 'blocked') {
				return { success: false, denied: true, reason: 'Action blocked by admin' };
			}

			const needsApproval = context.permissions?.deleteWorkflow !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Archive workflow "${input.workflowName ?? input.workflowId}"? This will deactivate it if needed and can be undone later.`,
					severity: 'warning' as const,
				});
				// suspend() never resolves — this line is unreachable but satisfies the type checker
				return { success: false };
			}

			// State 2: Denied
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			// State 3: Approved or always_allow — execute
			await context.workflowService.archive(input.workflowId);
			return { success: true };
		},
	});
}
