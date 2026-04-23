import { createTool } from '@mastra/core/tools';
import {
	instanceAiEvalsProposeSuspendSchema,
	instanceAiEvalsProposeResumeSchema,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { applyEvalSetup } from './apply-eval-setup.service';
import { detectAiNodes } from './detect-ai-nodes';
import { DEFAULT_EVAL_SHAPE, inferEvalShape, type EvalShape } from './infer-eval-shape.service';
import type { InstanceAiContext } from '../../types';

const inputSchema = z.object({
	action: z.literal('propose').describe('Propose an evaluation setup for an AI workflow'),
	workflowId: z.string().describe('ID of the workflow'),
	projectId: z.string().optional().describe('Project ID (for DataTable creation)'),
});

type Input = z.infer<typeof inputSchema>;

export function createEvalsTool(context: InstanceAiContext) {
	// Cache the proposal produced in phase 1 so phase 2 (apply) uses the
	// same metric IDs the user saw in the card. Keyed by workflowId to
	// keep this state machine robust across concurrent propose calls.
	const proposalCache: Map<string, EvalShape> = new Map();

	return createTool({
		id: 'evals',
		description:
			'Propose an evaluation setup (EvaluationTrigger + Evaluation nodes + optional sample dataset) for workflows containing AI/LLM nodes. Call after `workflows(action="setup")` for AI workflows only.',
		inputSchema,
		suspendSchema: instanceAiEvalsProposeSuspendSchema,
		resumeSchema: instanceAiEvalsProposeResumeSchema,
		execute: async (input: Input, ctx) => {
			const resumeData = ctx?.agent?.resumeData as
				| z.infer<typeof instanceAiEvalsProposeResumeSchema>
				| undefined;
			const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<void>) | undefined;

			// Phase 1: initial call — check gate, infer shape, suspend
			if (resumeData === undefined || resumeData === null) {
				const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
				const detection = detectAiNodes(wf);
				if (!detection.isAiWorkflow) {
					return { skipped: true, reason: 'Workflow has no AI/LLM nodes.' };
				}
				if (detection.alreadyConfigured) {
					return {
						skipped: true,
						reason: 'Workflow already has an EvaluationTrigger or Evaluation node.',
					};
				}
				const shape = await inferEvalShape(wf).catch(() => DEFAULT_EVAL_SHAPE);
				proposalCache.set(input.workflowId, shape);

				await suspend?.({
					requestId: nanoid(),
					message: 'This workflow uses AI nodes. Set up evaluations?',
					severity: 'info' as const,
					workflowId: input.workflowId,
					...(input.projectId ? { projectId: input.projectId } : {}),
					detectedAiNodes: detection.aiNodeNames,
					proposedGraphSummary: {
						evalTriggerName: 'EvaluationTrigger',
						setOutputsNodeName: 'EvaluationSetOutputs',
						setMetricsNodeName: 'EvaluationSetMetrics',
					},
					datasetOptions: {
						suggestedColumns: {
							input: shape.suggestedInputColumns,
							output: shape.suggestedOutputColumns,
						},
					},
					suggestedMetrics: shape.suggestedMetrics,
				});
				return { success: false };
			}

			// Phase 2: resume — user responded
			if (!resumeData.approved) {
				proposalCache.delete(input.workflowId);
				return { success: true, deferred: true, reason: 'User skipped eval setup.' };
			}

			// Reuse the cached proposal so the metric IDs match what the user selected.
			// If the cache is missing (e.g. server restart between suspend and resume),
			// fall back to a fresh inference — the user may see slightly different
			// metric resolution but the flow still completes.
			let shape = proposalCache.get(input.workflowId);
			if (shape === undefined) {
				const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
				shape = await inferEvalShape(wf).catch(() => DEFAULT_EVAL_SHAPE);
			}
			proposalCache.delete(input.workflowId);

			const result = await applyEvalSetup(context, {
				workflowId: input.workflowId,
				projectId: input.projectId,
				userChoice: {
					datasetChoice: resumeData.datasetChoice ?? 'later',
					existingDataTableId: resumeData.existingDataTableId,
					enabledMetricIds: resumeData.enabledMetricIds ?? [],
				},
				proposal: shape,
			});

			return result;
		},
	});
}
