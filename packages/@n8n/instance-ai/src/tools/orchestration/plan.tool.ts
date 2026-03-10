import { createTool } from '@mastra/core/tools';
import type { PlanObject } from '@n8n/api-types';

import { planInputSchema, planOutputSchema } from './plan.schemas';
import type { OrchestrationContext } from '../../types';

function requirePlan(plan: PlanObject | undefined): PlanObject {
	if (!plan) throw new Error('plan is required for create/update actions');
	return plan;
}

export function createPlanTool(context: OrchestrationContext) {
	function emitPlanUpdate(plan: PlanObject): void {
		context.eventBus.publish(context.threadId, {
			type: 'plan-update',
			runId: context.runId,
			agentId: context.orchestratorAgentId,
			payload: { plan },
		});
	}

	return createTool({
		id: 'plan',
		description:
			'Create, update, or review the execution plan. Call this before and ' +
			'after each phase of the autonomous loop. Writing the plan forces ' +
			'structured reasoning; reading it back prevents goal drift.',
		inputSchema: planInputSchema,
		outputSchema: planOutputSchema,
		execute: async (inputData) => {
			switch (inputData.action) {
				case 'create': {
					const plan = requirePlan(inputData.plan);
					await context.planStorage.save(context.threadId, plan);
					emitPlanUpdate(plan);
					return {
						plan,
						message: `Plan created with ${plan.steps.length} steps. Current phase: ${plan.currentPhase}.`,
					};
				}
				case 'update': {
					const plan = requirePlan(inputData.plan);
					await context.planStorage.save(context.threadId, plan);
					emitPlanUpdate(plan);
					return {
						plan,
						message: `Plan updated. Phase: ${plan.currentPhase}, iteration: ${plan.iteration}.`,
					};
				}
				case 'review': {
					const plan = await context.planStorage.get(context.threadId);
					return {
						plan: plan ?? null,
						message: plan
							? `Current plan: phase=${plan.currentPhase}, iteration=${plan.iteration}, ${plan.steps.length} steps.`
							: 'No plan exists for this thread.',
					};
				}
			}
		},
	});
}
