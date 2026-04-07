import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const stopExecutionInputSchema = z.object({
	executionId: z.string().describe('ID of the execution to cancel'),
});

export function createStopExecutionTool(context: InstanceAiContext) {
	return createTool({
		id: 'stop-execution',
		description: 'Cancel a running workflow execution by its ID.',
		inputSchema: stopExecutionInputSchema,
		outputSchema: z.object({
			success: z.boolean(),
			message: z.string(),
		}),
		execute: async (inputData: z.infer<typeof stopExecutionInputSchema>) => {
			return await context.executionService.stop(inputData.executionId);
		},
	});
}
