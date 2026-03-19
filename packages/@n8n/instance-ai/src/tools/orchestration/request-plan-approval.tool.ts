import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { normalizePlanStatusForReview } from './plan-utils';
import type { OrchestrationContext } from '../../types';

export function createRequestPlanApprovalTool(context: OrchestrationContext) {
	return createTool({
		id: 'request-plan-approval',
		description:
			'Suspend after presenting a plan and wait for the user to approve it or request changes.',
		inputSchema: z.object({
			planId: z.string().describe('The plan that is being reviewed.'),
			message: z
				.string()
				.optional()
				.describe('Optional approval prompt shown above the approve/request changes actions.'),
		}),
		outputSchema: z.object({
			approved: z.boolean(),
			feedback: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: z.literal('info'),
			inputType: z.literal('approval'),
		}),
		resumeSchema: z.object({
			approved: z.boolean(),
			userInput: z.string().optional(),
		}),
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};

			if (resumeData === undefined || resumeData === null) {
				const plan = await context.planStorage.get(context.threadId);
				if (!plan || plan.planId !== input.planId) {
					return { approved: false };
				}

				const nextStatus = normalizePlanStatusForReview(plan.status);
				if (plan.status !== nextStatus) {
					const updatedPlan = {
						...plan,
						status: nextStatus,
						lastUpdatedAt: new Date().toISOString(),
					};
					await context.planStorage.save(context.threadId, updatedPlan);
					context.eventBus.publish(context.threadId, {
						type: 'plan-status-updated',
						runId: context.runId,
						agentId: context.orchestratorAgentId,
						payload: {
							planId: updatedPlan.planId,
							status: updatedPlan.status,
						},
					});
				}

				await suspend?.({
					requestId: nanoid(),
					message:
						input.message ??
						'Review the plan, then approve it to start building or request changes to revise it.',
					severity: 'info' as const,
					inputType: 'approval' as const,
				});
				return { approved: false };
			}

			if (!resumeData.approved) {
				return {
					approved: false,
					feedback: resumeData.userInput ?? '',
				};
			}

			return { approved: true };
		},
	});
}
