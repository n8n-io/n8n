import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

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
		}),
		execute: async (inputData) => {
			if (inputData.active) {
				await context.workflowService.activate(inputData.workflowId);
			} else {
				await context.workflowService.deactivate(inputData.workflowId);
			}
			return { success: true };
		},
	});
}
