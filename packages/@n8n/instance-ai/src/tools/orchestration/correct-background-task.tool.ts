import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';

/**
 * Tool that lets the orchestrator send a correction message to a running background task.
 * Used when the user sends a course correction while a build is in progress
 * (e.g. "use the Projects database, not Tasks").
 */
export function createCorrectBackgroundTaskTool(context: OrchestrationContext) {
	return createTool({
		id: 'correct-background-task',
		description:
			'Send a correction to a running background task (e.g. a workflow builder). ' +
			'Use when the user sends a message that is clearly a correction for an in-progress build ' +
			'(mentions specific nodes, databases, credentials, or says "wait"/"use X instead"). ' +
			'Running task IDs are listed in the <running-tasks> section of the message.',
		inputSchema: z.object({
			taskId: z.string().describe('The task ID to send the correction to (e.g. build-XXXXXXXX)'),
			correction: z
				.string()
				.describe("The correction message from the user (e.g. 'use the Projects database')"),
		}),
		execute: async (input) => {
			if (!context.sendCorrectionToTask) {
				return await Promise.resolve({ result: 'Error: correction delivery not available.' });
			}
			const status = context.sendCorrectionToTask(input.taskId, input.correction);
			if (status === 'task-not-found') {
				return await Promise.resolve({
					result: `Task ${input.taskId} not found. It may have already been cleaned up.`,
				});
			}
			if (status === 'task-completed') {
				return await Promise.resolve({
					result:
						`Task ${input.taskId} has already completed. The correction was not delivered. ` +
						`Incorporate "${input.correction}" into a new follow-up task instead.`,
				});
			}
			return await Promise.resolve({
				result: `Correction sent to task ${input.taskId}: "${input.correction}". The builder will see this on its next step.`,
			});
		},
	});
}
