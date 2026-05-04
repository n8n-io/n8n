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
			'Propose an evaluation setup for any workflow containing AI/LLM nodes. Call this when the user explicitly asks to add evaluations to an existing workflow. When approved, returns a task for the orchestrator to pass to `eval-setup-with-agent`.',
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

			// Filter metrics by user selection, falling back to defaults if none selected.
			const selectedMetricIds =
				resumeData.enabledMetricIds && resumeData.enabledMetricIds.length > 0
					? resumeData.enabledMetricIds
					: shape.suggestedMetrics.filter((m) => m.defaultEnabled).map((m) => m.id);
			const enabledMetrics = shape.suggestedMetrics.filter((m) => selectedMetricIds.includes(m.id));

			const dataTableId = resumeData.existingDataTableId;
			const datasetChoiceForTask =
				resumeData.datasetChoice === 'link-existing' && dataTableId
					? ('link-existing' as const)
					: resumeData.datasetChoice === 'later'
						? ('later' as const)
						: ('create-empty' as const);

			// Format the task for eval-setup-agent. From the sub-agent's POV, the
			// DataTable is an empty table it must create.
			const task = formatEvalSetupTask({
				workflowId: input.workflowId,
				workflowName: wf.name ?? 'Workflow',
				detectedAiNodes: detection.aiNodeNames,
				datasetChoice: datasetChoiceForTask,
				existingDataTableId: dataTableId,
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
				...(dataTableId ? { dataTableId } : {}),
			};
		},
	});
}
