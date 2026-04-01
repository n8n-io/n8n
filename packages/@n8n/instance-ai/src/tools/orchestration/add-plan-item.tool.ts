/**
 * add-plan-item tool — progressive plan item emission.
 *
 * The planner sub-agent calls this once per blueprint item as it designs it.
 * Each call publishes a `tasks-update` event so the task checklist populates
 * progressively in the UI. After the planner finishes, the orchestrator
 * validates the full graph via `createPlan()` and suspends for approval.
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
			'Emit data tables FIRST, then workflows that depend on them. ' +
			'Set summary and assumptions on your first call.',
		inputSchema: addPlanItemInputSchema,
		outputSchema: z.object({ result: z.string() }),
		execute: async (input) => {
			// Update plan-level metadata if provided
			if (input.summary !== undefined || input.assumptions !== undefined) {
				accumulator.updateMeta(input.summary, input.assumptions);
			}

			// Add the item and get the resulting task
			const task = accumulator.addItem(input.item);

			// Persist checklist to thread metadata (survives refresh/reconnect)
			const taskItems = accumulator.getTaskItemsForEvent();
			await context.taskStorage.save(context.threadId, { tasks: taskItems });

			// Publish tasks-update event so the UI updates progressively.
			// Uses orchestratorAgentId (not the planner's sub-agent ID) so the
			// event lands on the orchestrator's agentNode where AgentTimeline reads it.
			// Includes full planItems so PlanReviewPanel can show specs/deps during planning.
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

			const totalCount = accumulator.getTaskItemsForEvent().length;
			return {
				result: `Added: ${task.title} (${totalCount} item${totalCount === 1 ? '' : 's'} total)`,
			};
		},
	});
}
