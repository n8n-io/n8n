import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import { formatTimestamp } from '../../utils/format-timestamp';

export const restoreWorkflowVersionInputSchema = z.object({
	workflowId: z.string().describe('ID of the workflow'),
	versionId: z.string().describe('ID of the version to restore'),
});

export const restoreWorkflowVersionResumeSchema = z.object({
	approved: z.boolean(),
});

export function createRestoreWorkflowVersionTool(context: InstanceAiContext) {
	return createTool({
		id: 'restore-workflow-version',
		description:
			'Restore a workflow to a previous version by overwriting the current draft with that ' +
			"version's nodes and connections. This does NOT affect the published/active version — " +
			'you must publish separately after restoring.',
		inputSchema: restoreWorkflowVersionInputSchema,
		outputSchema: z.object({
			success: z.boolean(),
			error: z.string().optional(),
			denied: z.boolean().optional(),
			reason: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
		}),
		resumeSchema: restoreWorkflowVersionResumeSchema,
		execute: async (input: z.infer<typeof restoreWorkflowVersionInputSchema>, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof restoreWorkflowVersionResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend;

			if (context.permissions?.restoreWorkflowVersion === 'blocked') {
				return { success: false, denied: true, reason: 'Action blocked by admin' };
			}

			const needsApproval = context.permissions?.restoreWorkflowVersion !== 'always_allow';

			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				const version = await context.workflowService.getVersion!(
					input.workflowId,
					input.versionId,
				).catch(() => undefined);
				const timestamp = version?.createdAt ? formatTimestamp(version.createdAt) : undefined;
				const versionLabel = version?.name
					? `"${version.name}" (${timestamp})`
					: `"${input.versionId}" (${timestamp ?? 'unknown date'})`;

				await suspend?.({
					requestId: nanoid(),
					message: `Restore workflow to version ${versionLabel}? This will overwrite the current draft.`,
					severity: 'warning' as const,
				});
				return { success: false };
			}

			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			try {
				await context.workflowService.restoreVersion!(input.workflowId, input.versionId);
				return { success: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Restore failed',
				};
			}
		},
	});
}
