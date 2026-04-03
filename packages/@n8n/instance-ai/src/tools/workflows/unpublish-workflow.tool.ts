import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createUnpublishWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'unpublish-workflow',
		description:
			'Unpublish a workflow — stops it from running in production. ' +
			'The draft is preserved and can be re-published later.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow to unpublish'),
			workflowName: z
				.string()
				.optional()
				.describe('Name of the workflow (for confirmation message)'),
		}),
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
		resumeSchema: z.object({
			approved: z.boolean(),
		}),
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};

			const needsApproval = context.permissions?.publishWorkflow !== 'always_allow';

			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				await suspend?.({
					requestId: nanoid(),
					message: `Unpublish workflow "${input.workflowName ?? input.workflowId}"?`,
					severity: 'warning' as const,
				});
				return { success: false };
			}

			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			try {
				await context.workflowService.unpublish(input.workflowId);
				return { success: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unpublish failed',
				};
			}
		},
	});
}
