import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import { publishCanvasEvent } from '../utils/canvas-events';

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
			// Canvas-aware: emit stop-manual-run event if on canvas
			if (context.canvasContext && inputData.executionId === 'canvas-manual-run') {
				publishCanvasEvent(context, 'stop-manual-run', {
					workflowId: context.canvasContext.workflowId,
				});
				return { success: true, message: 'Requested canvas execution stop' };
			}
			return await context.executionService.stop(inputData.executionId);
		},
	});
}
