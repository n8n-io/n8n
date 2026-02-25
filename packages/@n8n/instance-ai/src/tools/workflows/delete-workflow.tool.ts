import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createDeleteWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'delete-workflow',
		description:
			'Permanently delete a workflow. This is irreversible — confirm with the user first.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow to delete'),
		}),
		outputSchema: z.object({
			success: z.boolean(),
		}),
		execute: async (inputData) => {
			await context.workflowService.delete(inputData.workflowId);
			return { success: true };
		},
	});
}
