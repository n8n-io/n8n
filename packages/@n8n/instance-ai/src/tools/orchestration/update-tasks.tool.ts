import { createTool } from '@mastra/core/tools';
import { taskListSchema } from '@n8n/api-types';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';

export function createUpdateTasksTool(context: OrchestrationContext) {
	return createTool({
		id: 'update-tasks',
		description:
			'Write or update a visible task checklist for multi-step work. ' +
			'Pass the full task list each time — it replaces the previous one.',
		inputSchema: taskListSchema,
		outputSchema: z.object({ saved: z.boolean() }),
		execute: async (input: z.infer<typeof taskListSchema>) => {
			await context.taskStorage.save(context.threadId, input);
			context.eventBus.publish(context.threadId, {
				type: 'tasks-update',
				runId: context.runId,
				agentId: context.orchestratorAgentId,
				payload: { tasks: input },
			});
			return { saved: true };
		},
	});
}
