import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { updatePlanPhase } from './plan-utils';
import type { OrchestrationContext } from '../../types';

export function createBlockPhaseWithQuestionTool(context: OrchestrationContext) {
	return createTool({
		id: 'block-phase-with-question',
		description:
			'Block a phase and ask the user a phase-scoped question. Use this instead of a generic ask-user prompt when the missing information belongs to a specific phase.',
		inputSchema: z.object({
			planId: z.string(),
			phaseId: z.string(),
			reason: z.string().describe('Why this phase cannot continue yet.'),
			question: z.string().describe('The exact question the user needs to answer.'),
		}),
		outputSchema: z.object({
			answered: z.boolean(),
			userInput: z.string().optional(),
		}),
		suspendSchema: z.object({
			requestId: z.string(),
			message: z.string(),
			severity: instanceAiConfirmationSeveritySchema,
			inputType: z.literal('text'),
		}),
		resumeSchema: z.object({
			approved: z.boolean(),
			userInput: z.string().optional(),
		}),
		execute: async (input, ctx) => {
			const { resumeData, suspend } = ctx?.agent ?? {};

			if (resumeData === undefined || resumeData === null) {
				const existingPlan = await context.planStorage.get(context.threadId);
				if (!existingPlan || existingPlan.planId !== input.planId) {
					return { answered: false };
				}

				const requestId = nanoid();
				const plan = updatePlanPhase(existingPlan, input.phaseId, 'blocked', {
					reason: input.reason,
					question: input.question,
					requestId,
					inputType: 'text',
				});
				const phase = plan.phases.find((currentPhase) => currentPhase.id === input.phaseId);
				if (!phase) {
					return { answered: false };
				}

				await context.planStorage.save(context.threadId, plan);
				context.eventBus.publish(context.threadId, {
					type: 'phase-status-updated',
					runId: context.runId,
					agentId: context.orchestratorAgentId,
					payload: {
						planId: plan.planId,
						phase,
					},
				});
				context.eventBus.publish(context.threadId, {
					type: 'plan-status-updated',
					runId: context.runId,
					agentId: context.orchestratorAgentId,
					payload: {
						planId: plan.planId,
						status: plan.status,
					},
				});

				await suspend?.({
					requestId,
					message: input.question,
					severity: 'info',
					inputType: 'text',
				});
				return { answered: false };
			}

			if (!resumeData.approved) {
				return { answered: false };
			}

			return { answered: true, userInput: resumeData.userInput ?? '' };
		},
	});
}
