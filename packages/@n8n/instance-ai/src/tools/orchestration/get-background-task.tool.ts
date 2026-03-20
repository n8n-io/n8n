import { createTool } from '@mastra/core/tools';
import { instanceAiTaskRunSchema } from '@n8n/api-types';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';

export function createGetBackgroundTaskTool(context: OrchestrationContext) {
	return createTool({
		id: 'get-background-task',
		description:
			'Get the current state of one background task by task ID. Use this when the user asks ' +
			'about a specific build, research job, or data-table task.',
		inputSchema: z.object({
			taskId: z.string().describe('The background task ID to inspect.'),
		}),
		outputSchema: z.object({
			found: z.boolean(),
			task: instanceAiTaskRunSchema.optional(),
		}),
		execute: async (input) => {
			if (!context.getBackgroundTask) {
				return { found: false };
			}

			const task = await context.getBackgroundTask(input.taskId);
			if (!task) {
				return { found: false };
			}

			return {
				found: true,
				task,
			};
		},
	});
}
