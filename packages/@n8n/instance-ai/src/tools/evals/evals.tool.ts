import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { detectAiNodes } from './detect-ai-nodes';
import { formatEvalSetupTask } from './format-eval-setup-task';
import { DEFAULT_EVAL_SHAPE, inferEvalShape, type EvalShape } from './infer-eval-shape.service';
import type { InstanceAiContext } from '../../types';

const ACTUAL_COLUMN_PREFIX_REGEX = /^actual[_-]/i;
const EXPECTED_COLUMN_PREFIX_REGEX = /^(expected[_-]|ground[_-]?truth)/i;

async function deriveShapeFromDataTable(
	context: InstanceAiContext,
	dataTableId: string,
	projectId: string | undefined,
	fallback: EvalShape,
): Promise<EvalShape> {
	try {
		const columns = await context.dataTableService.getSchema(dataTableId, { projectId });
		const names = columns.map((c) => c.name);
		const expectedColumns = names.filter((n) => EXPECTED_COLUMN_PREFIX_REGEX.test(n));
		const inputColumns = names.filter(
			(n) => !ACTUAL_COLUMN_PREFIX_REGEX.test(n) && !EXPECTED_COLUMN_PREFIX_REGEX.test(n),
		);

		if (inputColumns.length === 0) return fallback;

		return {
			suggestedInputColumns: inputColumns,
			suggestedOutputColumns:
				expectedColumns.length > 0 ? expectedColumns : fallback.suggestedOutputColumns,
			suggestedMetrics: fallback.suggestedMetrics,
		};
	} catch {
		return fallback;
	}
}

const inputSchema = z.object({
	action: z.literal('propose').describe('Propose an evaluation setup for an AI workflow'),
	workflowId: z.string().describe('ID of the workflow'),
	projectId: z
		.string()
		.optional()
		.describe('Project ID (forwarded to the eval-setup-agent for DataTable creation)'),
	datasetChoice: z
		.enum(['create-empty', 'link-existing', 'later'])
		.optional()
		.describe(
			'Dataset strategy. Default `create-empty` — sub-agent creates a fresh empty DataTable. ' +
				'Use `link-existing` when the user references an existing DataTable (must pass `existingDataTableId`). ' +
				'Use `later` when the user explicitly wants to wire the dataset themselves.',
		),
	existingDataTableId: z
		.string()
		.optional()
		.describe(
			'Required when `datasetChoice="link-existing"`. The DataTable id to wire into the EvaluationTrigger.',
		),
});

type Input = z.infer<typeof inputSchema>;

export function createEvalsTool(context: InstanceAiContext) {
	return createTool({
		id: 'evals',
		description:
			'Propose an evaluation setup for any workflow containing AI/LLM nodes. Call this when the user explicitly asks to add evaluations to an existing workflow. Returns a task for the orchestrator to pass to `eval-setup-with-agent`.',
		inputSchema,
		execute: async (input: Input) => {
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
			if (detection.rootAgentReadsOtherNode) {
				return {
					skipped: true,
					reason:
						"A root AI agent reads JSON from another node directly (e.g. $('Some Node').item.json). Topology-only eval setup cannot isolate this target without modifying production node parameters or mocking those upstream nodes.",
				};
			}

			const inferred = await inferEvalShape(wf).catch(() => DEFAULT_EVAL_SHAPE);

			// For link-existing, the table's real columns override the LLM guess.
			const shape: EvalShape =
				input.datasetChoice === 'link-existing' && input.existingDataTableId
					? await deriveShapeFromDataTable(
							context,
							input.existingDataTableId,
							input.projectId,
							inferred,
						)
					: inferred;

			const enabledMetrics = shape.suggestedMetrics.filter((m) => m.defaultEnabled);

			const datasetChoice =
				input.datasetChoice === 'link-existing' && input.existingDataTableId
					? 'link-existing'
					: input.datasetChoice === 'later'
						? 'later'
						: 'create-empty';

			const task = formatEvalSetupTask({
				workflowId: input.workflowId,
				workflowName: wf.name ?? 'Workflow',
				detectedAiNodes: detection.aiNodeNames,
				datasetChoice,
				existingDataTableId: input.existingDataTableId,
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
				...(input.existingDataTableId ? { dataTableId: input.existingDataTableId } : {}),
			};
		},
	});
}
