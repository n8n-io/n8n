import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createRunWorkflowTool(context: InstanceAiContext) {
	return createTool({
		id: 'run-workflow',
		description:
			'Execute a workflow and return the execution ID. Use get-execution to check results.',
		inputSchema: z.object({
			workflowId: z.string().describe('ID of the workflow to execute'),
			inputData: z
				.record(z.unknown())
				.optional()
				.describe('Input data passed to the workflow trigger'),
		}),
		outputSchema: z.object({
			executionId: z.string(),
		}),
		execute: async (inputData) => {
			return await context.executionService.run(inputData.workflowId, inputData.inputData);
		},
	});
}
