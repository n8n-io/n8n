import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { detectAiNodes } from './detect-ai-nodes';
import { formatEvalSetupTask } from './format-eval-setup-task';
import { DEFAULT_EVAL_SHAPE, inferEvalShape, type EvalShape } from './infer-eval-shape.service';
import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
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

const proposeAction = z.object({
	action: z
		.literal('propose')
		.describe('Build a full eval-setup task to delegate to `eval-setup-with-agent`'),
	workflowId: z.string().describe('ID of the workflow'),
	projectId: z
		.string()
		.optional()
		.describe('Project ID — forwarded to the eval-setup-agent for DataTable creation'),
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

const offerAction = z.object({
	action: z
		.literal('offer')
		.describe(
			'Proactive offer: precheck eligibility and, if eligible, suspend with a strict approve/deny confirmation widget asking the user whether to generate an eval suite. No free-text input.',
		),
	workflowId: z.string().describe('ID of the workflow'),
	projectId: z
		.string()
		.optional()
		.describe('Project ID — forwarded to the eval-setup-agent for DataTable creation'),
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [proposeAction, offerAction]),
);

type Input = z.infer<typeof inputSchema>;

const confirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
});

const confirmationResumeSchema = z.object({
	approved: z.boolean(),
});

type ResumeData = z.infer<typeof confirmationResumeSchema>;

function offerMessage(aiNodeNames: string[]): string {
	if (aiNodeNames.length === 1) {
		return `Generate an eval suite for AI node \`${aiNodeNames[0]}\`?`;
	}
	return `Generate an eval suite for ${aiNodeNames.length} AI nodes in this workflow?`;
}

export function createEvalsTool(context: InstanceAiContext) {
	return createTool({
		id: 'evals',
		description:
			"Offer a proactive eval-suite setup (`action='offer'`, shows an approve/deny widget when the workflow is eligible) or build a full eval-setup task to delegate (`action='propose'`). Use `offer` after a fresh AI workflow build; use `propose` after the user accepts the offer, or when the user explicitly asks to add evals to an existing workflow.",
		inputSchema,
		suspendSchema: confirmationSuspendSchema,
		resumeSchema: confirmationResumeSchema,
		execute: async (input: Input, ctx) => {
			if (input.action === 'offer') {
				const resumeData = ctx?.agent?.resumeData as ResumeData | undefined;
				const suspend = ctx?.agent?.suspend;

				const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
				const detection = detectAiNodes(wf);

				// Resume path — short-circuit on user response without re-detecting.
				if (resumeData !== undefined && resumeData !== null) {
					if (!resumeData.approved) {
						return { eligible: true as const, approved: false as const };
					}
					return {
						eligible: true as const,
						approved: true as const,
						aiNodeNames: detection.aiNodeNames,
					};
				}

				// First call — precheck. Only suspend when eligible.
				if (!detection.isAiWorkflow) {
					return { eligible: false as const, reason: 'no-ai-nodes' as const };
				}
				if (detection.alreadyConfigured) {
					return { eligible: false as const, reason: 'already-configured' as const };
				}
				if (detection.rootAgentReadsOtherNode) {
					return {
						eligible: false as const,
						reason: 'root-agent-reads-other-node' as const,
					};
				}

				await suspend?.({
					requestId: nanoid(),
					message: offerMessage(detection.aiNodeNames),
					severity: 'info' as const,
				});
				// suspend() never resolves on first call.
				return { eligible: true as const, approved: false as const };
			}

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

			// When linking an existing DataTable, the table's actual columns are
			// authoritative — the LLM-inferred shape is only a guess. Override the
			// suggested input/output columns with the real schema so the eval-setup
			// agent's shape bridge references columns that actually exist.
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
