import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';

/**
 * Tool that lets the orchestrator cancel a running background task by ID.
 * Used when the user says something like "stop building that workflow".
 * The orchestrator sees running task IDs via the enriched message context.
 */
export function createCancelBackgroundTaskTool(context: OrchestrationContext) {
	return createTool({
		id: 'cancel-background-task',
		description:
			'Cancel a running background task (workflow builder, data table manager) by its task ID. ' +
			'Use when the user asks to stop a background task. ' +
			'Running task IDs are listed in the <running-tasks> section of the message.',
		inputSchema: z.object({
			taskId: z.string().describe('The task ID to cancel (e.g. build-XXXXXXXX)'),
		}),
		execute: async (input) => {
			if (!context.cancelBackgroundTask) {
				return { result: 'Error: background task cancellation not available.' };
			}
			await context.cancelBackgroundTask(input.taskId);
			return { result: `Background task ${input.taskId} cancelled.` };
		},
	});
}
