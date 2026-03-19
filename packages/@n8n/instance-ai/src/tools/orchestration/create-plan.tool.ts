import { createTool } from '@mastra/core/tools';
import {
	instanceAiPhaseSpecSchema,
	instanceAiPlanStatusSchema,
	type InstanceAiPlanSpec,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { normalizePhase, normalizePlanStatusForReview } from './plan-utils';
import type { OrchestrationContext } from '../../types';

const createPlanInputSchema = z.object({
	goal: z.string().describe('What the user wants accomplished.'),
	summary: z.string().describe('Short summary of the integration plan.'),
	assumptions: z.array(z.string()).default([]),
	externalSystems: z.array(z.string()).default([]),
	dataContracts: z.array(z.string()).default([]),
	acceptanceCriteria: z.array(z.string()).default([]),
	openQuestions: z.array(z.string()).default([]),
	status: instanceAiPlanStatusSchema.optional(),
	phases: z.array(
		instanceAiPhaseSpecSchema.omit({ status: true, artifacts: true }).extend({
			status: instanceAiPhaseSpecSchema.shape.status.optional(),
			artifacts: instanceAiPhaseSpecSchema.shape.artifacts.optional(),
		}),
	),
});

export function createCreatePlanTool(context: OrchestrationContext) {
	return createTool({
		id: 'create-plan',
		description:
			'Create a phase-based execution plan for multi-step workflow work. ' +
			'The plan should define goals, assumptions, testable milestones, and verification steps, but not workflow topology.',
		inputSchema: createPlanInputSchema,
		outputSchema: z.object({
			saved: z.boolean(),
			planId: z.string(),
		}),
		execute: async (input) => {
			const plan: InstanceAiPlanSpec = {
				planId: `plan_${nanoid(8)}`,
				goal: input.goal,
				summary: input.summary,
				assumptions: input.assumptions,
				externalSystems: input.externalSystems,
				dataContracts: input.dataContracts,
				acceptanceCriteria: input.acceptanceCriteria,
				openQuestions: input.openQuestions,
				status: normalizePlanStatusForReview(input.status),
				phases: input.phases.map((phase) => normalizePhase(phase)),
				lastUpdatedAt: new Date().toISOString(),
			};

			await context.planStorage.save(context.threadId, plan);
			context.eventBus.publish(context.threadId, {
				type: 'plan-created',
				runId: context.runId,
				agentId: context.orchestratorAgentId,
				payload: { plan },
			});

			return {
				saved: true,
				planId: plan.planId,
			};
		},
	});
}
