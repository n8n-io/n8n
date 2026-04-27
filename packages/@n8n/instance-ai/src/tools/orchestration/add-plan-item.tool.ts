/**
 * Plan item tools — add and remove items from the plan progressively.
 *
 * The planner sub-agent uses these during initial planning (add-plan-item)
 * and during revision after user rejection (both add and remove).
 * Each call publishes a `tasks-update` event so the UI updates in real time.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { BlueprintAccumulator } from './blueprint-accumulator';
import {
	blueprintDataTableItemSchema,
	blueprintDelegateItemSchema,
	blueprintResearchItemSchema,
	blueprintWorkflowItemSchema,
} from './blueprint.schema';
import type { OrchestrationContext } from '../../types';

/** Publish the current accumulator state as a tasks-update event with full planItems. */
export function publishPlanUpdate(
	accumulator: BlueprintAccumulator,
	context: OrchestrationContext,
): void {
	const taskItems = accumulator.getTaskItemsForEvent();
	const planItems = accumulator.getTaskList().map((t) => ({
		id: t.id,
		title: t.title,
		kind: t.kind,
		spec: t.spec,
		deps: t.deps,
		...(t.tools ? { tools: t.tools } : {}),
		...(t.workflowId ? { workflowId: t.workflowId } : {}),
	}));
	context.eventBus.publish(context.threadId, {
		type: 'tasks-update',
		runId: context.runId,
		agentId: context.orchestratorAgentId,
		payload: { tasks: { tasks: taskItems }, planItems },
	});
}

const addPlanItemInputSchema = z.object({
	summary: z.string().optional().describe('1-2 sentence plan overview — set on first call'),
	assumptions: z
		.array(z.string())
		.optional()
		.describe('Assumptions the plan relies on — set on first call'),
	item: z.discriminatedUnion('kind', [
		blueprintWorkflowItemSchema.extend({ kind: z.literal('workflow') }),
		blueprintDataTableItemSchema.extend({ kind: z.literal('data-table') }),
		blueprintResearchItemSchema.extend({ kind: z.literal('research') }),
		blueprintDelegateItemSchema.extend({ kind: z.literal('delegate') }),
	]),
});

export function createAddPlanItemTool(
	accumulator: BlueprintAccumulator,
	context: OrchestrationContext,
) {
	return createTool({
		id: 'add-plan-item',
		description:
			'Add a single plan item (data table, workflow, research, or delegate task). ' +
			'Call once per item as you design it — each call makes the item visible to the user immediately. ' +
			'Emit data tables FIRST. Add workflow items only if the request requires automation. ' +
			'Set summary and assumptions on your first call.',
		inputSchema: addPlanItemInputSchema,
		outputSchema: z.object({ result: z.string() }),
		execute: async (input: z.infer<typeof addPlanItemInputSchema>) => {
			if (input.summary !== undefined || input.assumptions !== undefined) {
				accumulator.updateMeta(input.summary, input.assumptions);
			}

			const task = accumulator.addItem(input.item);

			await context.taskStorage.save(context.threadId, {
				tasks: accumulator.getTaskItemsForEvent(),
			});
			publishPlanUpdate(accumulator, context);

			const totalCount = accumulator.getTaskItemsForEvent().length;
			return {
				result: `Added: ${task.title} (${totalCount} item${totalCount === 1 ? '' : 's'} total)`,
			};
		},
	});
}

export function createRemovePlanItemTool(
	accumulator: BlueprintAccumulator,
	context: OrchestrationContext,
) {
	return createTool({
		id: 'remove-plan-item',
		description:
			'Remove a plan item by ID. Use during plan revision to drop items the user no longer wants.',
		inputSchema: z.object({
			id: z.string().describe('ID of the plan item to remove'),
		}),
		outputSchema: z.object({ result: z.string() }),
		execute: async (input: { id: string }) => {
			const removed = accumulator.removeItem(input.id);

			await context.taskStorage.save(context.threadId, {
				tasks: accumulator.getTaskItemsForEvent(),
			});
			publishPlanUpdate(accumulator, context);

			const totalCount = accumulator.getTaskItemsForEvent().length;
			if (removed) {
				return {
					result: `Removed item ${input.id}. ${totalCount} item${totalCount === 1 ? '' : 's'} remaining.`,
				};
			}
			return {
				result: `Item ${input.id} not found. ${totalCount} item${totalCount === 1 ? '' : 's'} in plan.`,
			};
		},
	});
}
