import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import { publishCanvasEvent } from '../utils/canvas-events';

export function createActivateWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'activate-workflow',
		description: 'Activate or deactivate a workflow. Active workflows run on their triggers.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow'),
			active: z.boolean().describe('true to activate, false to deactivate'),
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

			const needsApproval = context.permissions?.activateWorkflow !== 'always_allow';

			// If approval is required and this is the first call, suspend for confirmation
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				const action = input.active ? 'Activate' : 'Deactivate';
				await suspend?.({
					requestId: nanoid(),
					message: `${action} workflow "${input.workflowId}"?`,
					severity: 'warning' as const,
				});
				return { success: false };
			}

			// If resumed with denial
			if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
				return { success: false, denied: true, reason: 'User denied the action' };
			}

			// Approved or always_allow — execute
			try {
				if (input.active) {
					await context.workflowService.activate(input.workflowId);
				} else {
					await context.workflowService.deactivate(input.workflowId);
				}
				// Emit canvas event so the frontend updates the active toggle
				publishCanvasEvent(context, 'workflow-activated', {
					workflowId: input.workflowId,
					active: input.active,
				});
				return { success: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Activation failed',
				};
			}
		},
	});
}
