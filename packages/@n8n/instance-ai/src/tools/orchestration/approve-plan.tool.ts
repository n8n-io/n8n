import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';

export function createApprovePlanTool(context: OrchestrationContext) {
	return createTool({
		id: 'approve-plan',
		description:
			'Mark the current plan as approved after the user accepts it, so phase execution can begin.',
		inputSchema: z.object({
			planId: z
				.string()
				.optional()
				.describe('The current plan ID. Optional when only one plan exists.'),
		}),
		outputSchema: z.object({
			approved: z.boolean(),
			planId: z.string().optional(),
		}),
		execute: async (input) => {
			const existingPlan = await context.planStorage.get(context.threadId);
			if (!existingPlan) {
				return { approved: false };
			}

			if (input.planId && input.planId !== existingPlan.planId) {
				return { approved: false, planId: existingPlan.planId };
			}

			const plan = {
				...existingPlan,
				status: 'approved' as const,
				lastUpdatedAt: new Date().toISOString(),
			};

			await context.planStorage.save(context.threadId, plan);
			context.eventBus.publish(context.threadId, {
				type: 'plan-status-updated',
				runId: context.runId,
				agentId: context.orchestratorAgentId,
				payload: {
					planId: plan.planId,
					status: plan.status,
				},
			});

			return {
				approved: true,
				planId: plan.planId,
			};
		},
	});
}
