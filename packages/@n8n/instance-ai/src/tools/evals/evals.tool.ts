import { createTool } from '@mastra/core/tools';
import {
	instanceAiEvalsProposeSuspendSchema,
	instanceAiEvalsProposeResumeSchema,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { detectAiNodes } from './detect-ai-nodes';
import { formatEvalSetupTask } from './format-eval-setup-task';
import { DEFAULT_EVAL_SHAPE, inferEvalShape, type EvalShape } from './infer-eval-shape.service';
import type { InstanceAiContext } from '../../types';

const inputSchema = z.object({
	action: z.literal('propose').describe('Propose an evaluation setup for an AI workflow'),
	workflowId: z.string().describe('ID of the workflow'),
	projectId: z
		.string()
		.optional()
		.describe('Project ID (forwarded to the eval-setup-agent for DataTable creation)'),
});

type Input = z.infer<typeof inputSchema>;

export function createEvalsTool(context: InstanceAiContext) {
	// Cache the proposal from phase 1 so phase 2 uses the same metric IDs
	// the user selected in the card.
	const proposalCache: Map<string, EvalShape> = new Map();

	return createTool({
		id: 'evals',
		description:
			'Propose an evaluation setup for workflows containing AI/LLM nodes. Call after `workflows(action="setup")` for AI workflows only. When approved, returns a task for the orchestrator to pass to `eval-setup-with-agent`.',
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

			// Re-fetch workflow + re-detect AI nodes (pure, deterministic).
			const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
			const detection = detectAiNodes(wf);

			// Reuse cached shape so metric IDs match the user's selection.
			const shape =
				proposalCache.get(input.workflowId) ??
				(await inferEvalShape(wf).catch(() => DEFAULT_EVAL_SHAPE));
			proposalCache.delete(input.workflowId);

			// Filter metrics by user selection.
			const enabledMetrics = shape.suggestedMetrics.filter((m) =>
				(resumeData.enabledMetricIds ?? []).includes(m.id),
			);

			// Format the task for eval-setup-agent.
			const task = formatEvalSetupTask({
				workflowId: input.workflowId,
				workflowName: wf.name ?? 'Workflow',
				detectedAiNodes: detection.aiNodeNames,
				datasetChoice: resumeData.datasetChoice ?? 'later',
				existingDataTableId: resumeData.existingDataTableId,
				projectId: input.projectId,
				suggestedInputColumns: shape.suggestedInputColumns,
				suggestedOutputColumns: shape.suggestedOutputColumns,
				enabledMetrics,
			});

			return {
				success: true,
				shouldDelegateToEvalSetupAgent: true,
				task,
				workflowId: input.workflowId,
				...(input.projectId ? { projectId: input.projectId } : {}),
			};
		},
	});
}
