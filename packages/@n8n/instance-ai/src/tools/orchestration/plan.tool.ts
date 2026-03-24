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

export function createPlanTool(context: OrchestrationContext) {
	return createTool({
		id: 'plan',
		description:
			'Persist a dependency-aware task plan for detached multi-step execution. ' +
			'Use ONLY when the work requires 2 or more tasks with dependencies ' +
			'(e.g. data table setup + multiple workflows, parallel builds + consolidation). ' +
			'Do NOT use for single workflow builds — call build-workflow-with-agent directly instead. ' +
			'The plan is shown to the user for approval before execution starts. ' +
			'After calling plan, reply briefly and end your turn.',
		inputSchema: planInputSchema,
		outputSchema: planOutputSchema,
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: z.literal('info'),
			inputType: z.literal('plan-review'),
			tasks: taskListSchema,
		}),
		resumeSchema: z.object({
			approved: z.boolean(),
			userInput: z.string().optional(),
		}),
		execute: async (input, ctx) => {
			if (!context.plannedTaskService || !context.schedulePlannedTasks) {
				return {
					result: 'Planning failed: planned task scheduling is not available.',
					taskCount: 0,
				};
			}

			const { resumeData, suspend } = ctx?.agent ?? {};

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
				const taskItems = input.tasks.map((t) => ({
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
				result: `User requested changes: ${resumeData.userInput ?? 'No feedback provided'}. Revise the plan and call plan() again.`,
				taskCount: 0,
			};
		},
	});
}
