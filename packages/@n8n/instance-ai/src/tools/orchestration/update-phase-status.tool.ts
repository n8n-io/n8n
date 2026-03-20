import { createTool } from '@mastra/core/tools';
import { instanceAiPhaseBlockerSchema, instanceAiPhaseStatusSchema } from '@n8n/api-types';
import { z } from 'zod';

import { ensurePlanExecutionContext, updatePlanPhase } from './plan-utils';
import type { OrchestrationContext } from '../../types';

export function createUpdatePhaseStatusTool(context: OrchestrationContext) {
	return createTool({
		id: 'update-phase-status',
		description:
			'Update one phase of the current plan as it moves through building, verifying, blocked, done, or failed.',
		inputSchema: z.object({
			planId: z.string(),
			phaseId: z.string(),
			status: instanceAiPhaseStatusSchema,
			blocker: instanceAiPhaseBlockerSchema.optional(),
		}),
		outputSchema: z.object({
			saved: z.boolean(),
		}),
		execute: async (input) => {
			const existingPlan = await context.planStorage.get(context.threadId);
			if (!existingPlan || existingPlan.planId !== input.planId) {
				return { saved: false };
			}

			const shouldEnsureExecutionContext =
				context.runtimeOwnedPlanActive === true ||
				context.planExecutionContext !== undefined ||
				existingPlan.executionContext !== undefined ||
				existingPlan.status === 'approved' ||
				existingPlan.status === 'running';
			const messageGroupId = context.planExecutionContext?.messageGroupId ?? context.messageGroupId;
			const lastTaskId =
				context.planExecutionContext?.lastTaskId ?? existingPlan.executionContext?.lastTaskId;
			const executionContext = {
				originRunId: context.planExecutionContext?.originRunId ?? context.runId,
				...(messageGroupId ? { messageGroupId } : {}),
				startedAt:
					context.planExecutionContext?.startedAt ??
					existingPlan.executionContext?.startedAt ??
					Date.now(),
				...(lastTaskId ? { lastTaskId } : {}),
			};
			const plan = updatePlanPhase(
				shouldEnsureExecutionContext
					? ensurePlanExecutionContext(existingPlan, executionContext)
					: existingPlan,
				input.phaseId,
				input.status,
				input.blocker,
			);
			const phase = plan.phases.find((currentPhase) => currentPhase.id === input.phaseId);
			if (!phase) {
				return { saved: false };
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

			return { saved: true };
		},
	});
}
