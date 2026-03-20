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

const updatePlanInputSchema = z.object({
	planId: z.string(),
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

export function createUpdatePlanTool(context: OrchestrationContext) {
	return createTool({
		id: 'update-plan',
		description:
			'Replace the current phase-based execution plan after user feedback or clarification.',
		inputSchema: updatePlanInputSchema,
		outputSchema: z.object({
			saved: z.boolean(),
			planId: z.string(),
			approved: z.boolean().optional(),
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

			if (resumeData !== undefined && resumeData !== null) {
				const existingPlan = await context.planStorage.get(context.threadId);
				if (!existingPlan) {
					return {
						saved: false,
						planId: input.planId,
						approved: false,
						feedback: resumeData.userInput ?? '',
					};
				}

				if (!resumeData.approved) {
					return {
						saved: true,
						planId: existingPlan.planId,
						approved: false,
						feedback: resumeData.userInput ?? '',
					};
				}

				return {
					saved: true,
					planId: existingPlan.planId,
					approved: true,
				};
			}

			const existingPlan = await context.planStorage.get(context.threadId);

			const plan: InstanceAiPlanSpec = {
				planId: input.planId,
				goal: input.goal,
				summary: input.summary,
				assumptions: input.assumptions,
				externalSystems: input.externalSystems,
				dataContracts: input.dataContracts,
				acceptanceCriteria: input.acceptanceCriteria,
				openQuestions: input.openQuestions,
				status: normalizePlanStatusForReview(input.status ?? existingPlan?.status),
				phases: input.phases.map((phase) => normalizePhase(phase)),
				lastUpdatedAt: new Date().toISOString(),
			};

			await context.planStorage.save(context.threadId, plan);
			context.eventBus.publish(context.threadId, {
				type: 'plan-updated',
				runId: context.runId,
				agentId: context.orchestratorAgentId,
				payload: { plan },
			});

			if (suspend) {
				await suspend?.({
					requestId: nanoid(),
					message:
						'Review the updated plan, then approve it to start building or request more changes.',
					severity: 'info' as const,
					inputType: 'approval' as const,
				});

				return {
					saved: true,
					planId: plan.planId,
					approved: false,
				};
			}

			return {
				saved: true,
				planId: plan.planId,
				approved: false,
			};
		},
	});
}
