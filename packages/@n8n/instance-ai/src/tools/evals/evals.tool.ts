import { createTool } from '@mastra/core/tools';
import {
	instanceAiEvalsProposeSuspendSchema,
	instanceAiEvalsProposeResumeSchema,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { detectAiNodes } from './detect-ai-nodes';
import { ensureEvalDataTable } from './ensure-eval-data-table.service';
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

			// DataTable prep (deterministic). When datasetChoice='generate', create
			// a new DataTable and populate it with Haiku-designed sample rows right
			// here — before delegating to the sub-agent. This keeps dataset
			// population reliable (the sub-agent otherwise skips insert-rows under
			// token/step pressure) and shrinks the sub-agent's scope to workflow
			// graph patching only.
			// Default to 'generate' when the FE approve card doesn't carry an explicit
			// dataset choice — users expressed that accepting evals should imply
			// auto-generating the sample dataset (no extra prompt).
			const datasetChoiceRaw = resumeData.datasetChoice ?? 'generate';
			let dataTableId: string | undefined = resumeData.existingDataTableId;
			let datasetChoiceForTask: 'link-existing' | 'later' = 'later';
			// eslint-disable-next-line no-console
			console.log('[evals] phase 2 dataset prep', {
				workflowId: input.workflowId,
				datasetChoiceRaw,
				existingDataTableId: resumeData.existingDataTableId,
				projectId: input.projectId,
				inputColumns: shape.suggestedInputColumns,
				outputColumns: shape.suggestedOutputColumns,
			});
			context.logger?.info('[evals] phase 2 dataset prep', {
				workflowId: input.workflowId,
				datasetChoiceRaw,
				existingDataTableId: resumeData.existingDataTableId,
				projectId: input.projectId,
			});
			if (datasetChoiceRaw === 'generate') {
				try {
					const dt = await ensureEvalDataTable(context, {
						workflowName: wf.name ?? 'Workflow',
						projectId: input.projectId,
						columns: [...shape.suggestedInputColumns, ...shape.suggestedOutputColumns],
						workflowForSamples: wf,
					});
					dataTableId = dt.id;
					datasetChoiceForTask = 'link-existing';
					// eslint-disable-next-line no-console
					console.log('[evals] DataTable created + populated', {
						dataTableId: dt.id,
						dataTableName: dt.name,
					});
					context.logger?.info('[evals] DataTable created and populated', {
						dataTableId: dt.id,
					});
				} catch (error) {
					// eslint-disable-next-line no-console
					console.error('[evals] ensureEvalDataTable FAILED', error);
					context.logger?.error('[evals] ensureEvalDataTable failed', {
						error: error instanceof Error ? error.message : String(error),
					});
					throw error;
				}
			} else if (datasetChoiceRaw === 'link-existing' && dataTableId) {
				datasetChoiceForTask = 'link-existing';
			}

			// Format the task for eval-setup-agent. From the sub-agent's POV, the
			// DataTable (if any) is already created — it only needs to wire the
			// EvaluationTrigger to the given id.
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
