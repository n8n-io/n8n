import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import { publishCanvasEvent } from '../utils/canvas-events';

export function createDeleteWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'delete-workflow',
		description:
			'Archive a workflow by ID. This is a soft delete that unpublishes the workflow if needed and can be undone later.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow to archive'),
		}),
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
		resumeSchema: z.object({
			approved: z.boolean(),
		}),
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};

			const needsApproval = context.permissions?.deleteWorkflow !== 'always_allow';

			// State 1: First call — suspend for confirmation (unless always_allow)
			if (needsApproval && (resumeData === undefined || resumeData === null)) {
				const workflow = await Promise.resolve(context.workflowService.get(input.workflowId)).catch(
					() => undefined,
				);
				const workflowLabel =
					typeof workflow?.name === 'string' && workflow.name.trim().length > 0
						? workflow.name
						: input.workflowId;

				await suspend?.({
					requestId: nanoid(),
					message: `Archive workflow "${workflowLabel}"? This will deactivate it if needed and can be undone later.`,
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
			// Emit canvas event so the frontend updates the workflow state
			publishCanvasEvent(context, 'workflow-archived', {
				workflowId: input.workflowId,
			});
			return { success: true };
		},
	});
}
