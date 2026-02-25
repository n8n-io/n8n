import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createDebugExecutionTool(context: InstanceAiContext) {
	return createTool({
		id: 'debug-execution',
		description:
			'Analyze a failed execution to identify the failing node, error cause, and suggest fixes.',
		inputSchema: z.object({
			executionId: z.string().describe('ID of the failed execution to debug'),
		}),
		outputSchema: z.object({
			executionId: z.string(),
			status: z.enum(['running', 'success', 'error', 'waiting']),
			error: z.string().optional(),
			data: z.record(z.unknown()).optional(),
			startedAt: z.string().optional(),
			finishedAt: z.string().optional(),
		}),
		execute: async (inputData) => {
			// Retrieve the full execution result for the agent to analyze
			return await context.executionService.getResult(inputData.executionId);
		},
	});
}
