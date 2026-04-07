import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createStopExecutionTool(context: InstanceAiContext) {
	return createTool({
		id: 'stop-execution',
		description: 'Cancel a running workflow execution by its ID.',
		inputSchema: z.object({
			executionId: z.string().describe('ID of the execution to cancel'),
		}),
		outputSchema: z.object({
			success: z.boolean(),
			message: z.string(),
		}),
		execute: async (inputData) => {
			return await context.executionService.stop(inputData.executionId);
		},
	});
}
