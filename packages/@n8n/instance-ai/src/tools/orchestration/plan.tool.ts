import { createTool } from '@mastra/core/tools';
import { taskListSchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
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

export const planResumeSchema = z.object({
	approved: z.boolean(),
	userInput: z.string().optional(),
});

export function createPlanTool(context: OrchestrationContext) {
	return createTool({
		id: 'create-tasks',
		description:
			'Submit a pre-built task list for detached multi-step execution. ' +
			'Use ONLY for replanning after a failure — when you already have the task context ' +
			'and do not need resource discovery. For initial planning, call `plan` instead. ' +
			'The task list is shown to the user for approval before execution starts. ' +
			'After calling create-tasks, reply briefly and end your turn.',
		inputSchema: planInputSchema,
		outputSchema: planOutputSchema,
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: z.literal('info'),
			inputType: z.literal('plan-review'),
			tasks: taskListSchema,
		}),
		resumeSchema: planResumeSchema,
		execute: async (input: z.infer<typeof planInputSchema>, ctx) => {
			if (!context.plannedTaskService || !context.schedulePlannedTasks) {
				return {
					result: 'Planning failed: planned task scheduling is not available.',
					taskCount: 0,
				};
			}

			const resumeData = ctx?.agent?.resumeData as z.infer<typeof planResumeSchema> | undefined;
			const suspend = ctx?.agent?.suspend;

			// First call — persist plan, show to user, suspend for approval
			if (resumeData === undefined || resumeData === null) {
				await context.plannedTaskService.createPlan(
					context.threadId,
					input.tasks as PlannedTask[],
					{
						planRunId: context.runId,
						messageGroupId: context.messageGroupId,
					},
				);

				// Emit tasks-update so the checklist appears in the chat immediately
				const taskItems = input.tasks.map((t: z.infer<typeof plannedTaskSchema>) => ({
					id: t.id,
					description: t.title,
					status: 'todo' as const,
				}));
				context.eventBus.publish(context.threadId, {
					type: 'tasks-update',
					runId: context.runId,
					agentId: context.orchestratorAgentId,
					payload: { tasks: { tasks: taskItems } },
				});

				// Suspend — frontend renders plan review UI
				await suspend?.({
					requestId: nanoid(),
					message: `Review the plan (${input.tasks.length} task${input.tasks.length === 1 ? '' : 's'}) before execution starts.`,
					severity: 'info' as const,
					inputType: 'plan-review' as const,
					tasks: { tasks: taskItems },
				});
				// suspend() never resolves
				return { result: 'Awaiting approval', taskCount: input.tasks.length };
			}

			// User approved — start execution
			if (resumeData.approved) {
				await context.schedulePlannedTasks();
				return {
					result: `Plan approved. Started ${input.tasks.length} task${input.tasks.length === 1 ? '' : 's'}.`,
					taskCount: input.tasks.length,
				};
			}

			// User rejected or requested changes — return feedback to LLM
			return {
				result: `User requested changes: ${resumeData.userInput ?? 'No feedback provided'}. Revise the tasks and call create-tasks again.`,
				taskCount: 0,
			};
		},
	});
}
