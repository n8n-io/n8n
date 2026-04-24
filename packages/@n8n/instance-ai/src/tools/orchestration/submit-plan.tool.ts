/**
 * submit-plan tool — HITL plan approval within the planner sub-agent.
 *
 * The planner calls this after adding all plan items. It validates the plan,
 * suspends for user approval (renders PlanReviewPanel), and returns the
 * user's decision. On rejection, the planner receives the feedback directly
 * and can make targeted edits (remove/add/update items) before re-submitting.
 */

import { createTool } from '@mastra/core/tools';
import { plannedTaskArgSchema, taskListSchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { publishPlanUpdate } from './add-plan-item.tool';
import type { BlueprintAccumulator } from './blueprint-accumulator';
import type { OrchestrationContext, PlannedTask } from '../../types';

export function createSubmitPlanTool(
	accumulator: BlueprintAccumulator,
	context: OrchestrationContext,
) {
	return createTool({
		id: 'submit-plan',
		description:
			"Submit the current plan for user approval. Returns the user's decision. " +
			'If rejected, the feedback is returned — make targeted changes with ' +
			'remove-plan-item / add-plan-item, then call submit-plan again.',
		inputSchema: z.object({}),
		outputSchema: z.object({
			approved: z.boolean(),
			feedback: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: z.literal('info'),
			inputType: z.literal('plan-review'),
			tasks: taskListSchema,
			planItems: z.array(plannedTaskArgSchema).optional(),
		}),
		resumeSchema: z.object({
			approved: z.boolean(),
			userInput: z.string().optional(),
		}),
		execute: async (_input, ctx) => {
			const { suspend } = ctx?.agent ?? {};
			const resumeData = ctx?.agent?.resumeData as
				| { approved: boolean; userInput?: string }
				| undefined;

			// Resume — return the user's decision to the planner
			if (resumeData !== undefined && resumeData !== null) {
				if (resumeData.approved) {
					accumulator.markApproved();
					return { approved: true };
				}
				return {
					approved: false,
					feedback: resumeData.userInput ?? 'No specific feedback provided.',
				};
			}

			// First call — validate, persist plan, suspend for approval
			accumulator.reconcileDependencies();
			const tasks = accumulator.getTaskList();

			if (!context.plannedTaskService) {
				return { approved: false, feedback: 'Plan scheduling not available.' };
			}

			// Persist the plan (createPlan validates deps, cycles, duplicates)
			await context.plannedTaskService.createPlan(
				context.threadId,
				tasks as unknown as PlannedTask[],
				{
					planRunId: context.runId,
					messageGroupId: context.messageGroupId,
				},
			);

			// Publish final tasks-update with full planItems
			publishPlanUpdate(accumulator, context);

			// Build suspend payload
			const taskItems = tasks.map((t) => ({
				id: t.id,
				description: t.title,
				status: 'todo' as const,
			}));
			const planItems = tasks.map((t) => ({
				id: t.id,
				title: t.title,
				kind: t.kind,
				spec: t.spec,
				deps: t.deps,
				...(t.tools ? { tools: t.tools } : {}),
				...(t.workflowId ? { workflowId: t.workflowId } : {}),
			}));

			// Suspend — Mastra HITL publishes confirmation-request, frontend renders PlanReviewPanel
			await suspend?.({
				requestId: nanoid(),
				message: `Review the plan (${tasks.length} task${tasks.length === 1 ? '' : 's'}) before execution starts.`,
				severity: 'info' as const,
				inputType: 'plan-review' as const,
				tasks: { tasks: taskItems },
				planItems,
			});

			// suspend() never resolves — this satisfies the type checker
			return { approved: false, feedback: 'Awaiting approval' };
		},
	});
}
