import { createTool } from '@mastra/core/tools';
import { instanceAiTaskRunSchema, instanceAiTaskStatusSchema } from '@n8n/api-types';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';

export function createListBackgroundTasksTool(context: OrchestrationContext) {
	return createTool({
		id: 'list-background-tasks',
		description:
			'List background tasks for the current thread. Use this to verify actual task state ' +
			'before reporting progress, blockers, or completion.',
		inputSchema: z.object({
			planId: z
				.string()
				.optional()
				.describe('Optional plan ID to narrow results to one runtime-owned plan.'),
			status: instanceAiTaskStatusSchema
				.optional()
				.describe('Optional task status filter, e.g. running or suspended.'),
		}),
		outputSchema: z.object({
			tasks: z.array(instanceAiTaskRunSchema),
		}),
		execute: async (input) => {
			if (!context.listBackgroundTasks) {
				return { tasks: [] };
			}

			return { tasks: await context.listBackgroundTasks(input) };
		},
	});
}
