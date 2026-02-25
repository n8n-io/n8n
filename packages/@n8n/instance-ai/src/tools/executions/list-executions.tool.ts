import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export function createListExecutionsTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-executions',
		description:
			'List recent workflow executions. Can filter by workflow ID and status. Returns execution ID, workflow name, status, and timestamps.',
		inputSchema: z.object({
			workflowId: z.string().optional().describe('Filter by workflow ID'),
			status: z
				.string()
				.optional()
				.describe('Filter by status (e.g. "success", "error", "running", "waiting")'),
			limit: z
				.number()
				.int()
				.positive()
				.max(100)
				.optional()
				.describe('Max results to return (default 20)'),
		}),
		outputSchema: z.object({
			executions: z.array(
				z.object({
					id: z.string(),
					workflowId: z.string(),
					workflowName: z.string(),
					status: z.string(),
					startedAt: z.string(),
					finishedAt: z.string().optional(),
					mode: z.string(),
				}),
			),
		}),
		execute: async (inputData) => {
			const executions = await context.executionService.list({
				workflowId: inputData.workflowId,
				status: inputData.status,
				limit: inputData.limit,
			});
			return { executions };
		},
	});
}
