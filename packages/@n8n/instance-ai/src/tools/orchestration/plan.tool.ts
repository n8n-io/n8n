import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { OrchestrationContext, PlannedTask } from '../../types';

const plannedTaskSchema = z.object({
	id: z.string().describe('Stable task identifier used by dependency edges'),
	title: z.string().describe('Short user-facing task title'),
	kind: z.enum(['delegate', 'build-workflow', 'manage-data-tables', 'research']),
	spec: z.string().describe('Detailed executor briefing for this task'),
	deps: z
		.array(z.string())
		.describe(
			'Task IDs that must succeed before this task can start. ' +
				'Data stores before workflows that use them; independent workflows in parallel.',
		),
	tools: z.array(z.string()).optional().describe('Required tool subset for delegate tasks'),
	workflowId: z
		.string()
		.optional()
		.describe('Existing workflow ID to modify (build-workflow tasks only)'),
});

const planInputSchema = z.object({
	tasks: z.array(plannedTaskSchema).min(1).describe('Dependency-aware execution plan'),
});

const planOutputSchema = z.object({
	result: z.string(),
	taskCount: z.number(),
});

export function createPlanTool(context: OrchestrationContext) {
	return createTool({
		id: 'plan',
		description:
			'Persist a dependency-aware task plan for detached multi-step execution. ' +
			'Use this when the work has multiple tasks with explicit prerequisites. ' +
			'After calling plan, reply briefly and end your turn.',
		inputSchema: planInputSchema,
		outputSchema: planOutputSchema,
		execute: async (input) => {
			if (!context.plannedTaskService || !context.schedulePlannedTasks) {
				return {
					result: 'Planning failed: planned task scheduling is not available.',
					taskCount: 0,
				};
			}

			await context.plannedTaskService.createPlan(context.threadId, input.tasks as PlannedTask[], {
				planRunId: context.runId,
				messageGroupId: context.messageGroupId,
			});
			await context.schedulePlannedTasks();

			return {
				result: `Planned ${input.tasks.length} task${input.tasks.length === 1 ? '' : 's'} and started execution.`,
				taskCount: input.tasks.length,
			};
		},
	});
}
