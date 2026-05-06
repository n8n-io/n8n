import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { analyzeAgentInputColumns } from './analyze-agent-input-columns.service';
import { detectAgentNamedRefs, type NamedRef } from './detect-agent-named-refs.service';
import { detectAiNodes } from './detect-ai-nodes';
import {
	describeMetricForWorkflow,
	recommendedMetricId,
} from './describe-metric-for-workflow.service';
import { createEmptyEvalDataTable } from './ensure-eval-data-table.service';
import { analyzeEvalDataRequirements } from './eval-data-requirements.service';
import { formatEvalSetupTask } from './format-eval-setup-task';
import {
	METRIC_CATALOG,
	METRIC_IDS,
	getMetricsByIds,
	proposeDefaultMetricIds,
	type MetricId,
} from './metric-catalog';
import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../../types';

// ── Action input schemas ───────────────────────────────────────────────────

const offerAction = z.object({
	action: z
		.literal('offer')
		.describe(
			'Proactive eligibility precheck. If the workflow has AI nodes and is not already configured for evals, suspend with a strict approve/deny widget.',
		),
	workflowId: z.string(),
	projectId: z.string().optional(),
});

const selectMetricsAction = z.object({
	action: z
		.literal('select-metrics')
		.describe(
			'Show the user a multi-select widget listing the canned eval metrics with workflow-aware default-checked entries. Returns chosenMetricIds.',
		),
	workflowId: z.string(),
});

const proposeAction = z.object({
	action: z
		.literal('propose')
		.describe(
			'Build the eval-setup task spec for the eval-setup sub-agent. Creates an empty DataTable by default — population is the responsibility of `eval-data`, invoked via `offer-data-population`.',
		),
	workflowId: z.string(),
	projectId: z.string().optional(),
	metrics: z.array(z.string()).default([]),
	datasetChoice: z.enum(['create-empty', 'link-existing', 'later']).default('create-empty'),
	existingDataTableId: z.string().optional(),
});

const offerDataPopulationAction = z.object({
	action: z
		.literal('offer-data-population')
		.describe(
			'After eval setup completes, ask the user whether to auto-populate the empty DataTable. Suspends with approve/deny.',
		),
	workflowId: z.string(),
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [
		offerAction,
		selectMetricsAction,
		proposeAction,
		offerDataPopulationAction,
	]),
);

type Input = z.infer<typeof inputSchema>;

// ── Suspend / resume schemas ───────────────────────────────────────────────

const confirmationSuspend = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
});

const questionSchema = z.object({
	id: z.string(),
	question: z.string(),
	type: z.enum(['single', 'multi', 'text']),
	options: z.array(z.string()).optional(),
});

const questionsSuspend = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: z.literal('info'),
	inputType: z.literal('questions'),
	questions: z.array(questionSchema),
	introMessage: z.string().optional(),
});

const suspendSchema = z.union([confirmationSuspend, questionsSuspend]);

const confirmResumeSchema = z.object({ approved: z.boolean() });

const questionsResumeSchema = z.object({
	approved: z.boolean(),
	answers: z
		.array(
			z.object({
				questionId: z.string(),
				selectedOptions: z.array(z.string()),
				customText: z.string().optional(),
				skipped: z.boolean().optional(),
			}),
		)
		.optional(),
});

const resumeSchema = z.union([confirmResumeSchema, questionsResumeSchema]);

type ConfirmResume = z.infer<typeof confirmResumeSchema>;
type QuestionsResume = z.infer<typeof questionsResumeSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────

function composeOfferMessage(aiNodeNames: string[], namedRefs: NamedRef[]): string {
	const baseMessage =
		aiNodeNames.length === 1
			? `Generate an eval suite for AI node \`${aiNodeNames[0]}\`?`
			: `Generate an eval suite for ${aiNodeNames.length} AI nodes in this workflow?`;

	if (namedRefs.length === 0) return baseMessage;

	// Disclosure: cite which named nodes will move and into which dataset columns.
	const sourceNodes = [...new Set(namedRefs.map((r) => r.nodeName))]
		.map((n) => `\`${n}\``)
		.join(', ');
	const targetColumns = namedRefs.map((r) => `\`${r.column}\``).join(', ');

	const noun = namedRefs.length === 1 ? 'expression' : 'expressions';
	const sourceLabel = namedRefs.length === 1 ? 'node' : 'nodes';

	return (
		`${baseMessage}\n\n` +
		`This will modify the agent's input ${noun} (currently reading from ${sourceLabel} ${sourceNodes}) ` +
		`and insert a Set node in the production path that maps those references to dataset ${targetColumns}, ` +
		`so the production behavior is preserved.`
	);
}

function isMetricId(id: string): id is MetricId {
	return (METRIC_IDS as readonly string[]).includes(id);
}

function metricNameOnly(label: string): string {
	// Strip " (recommended)" suffix if present.
	const withoutTag = label.replace(/\s*\(recommended\)\s*$/i, '');
	// Strip " — description" if present.
	const dashIndex = withoutTag.indexOf(' — ');
	return dashIndex >= 0 ? withoutTag.slice(0, dashIndex) : withoutTag;
}

function labelToId(label: string): string | undefined {
	const name = metricNameOnly(label);
	for (const id of METRIC_IDS) {
		if (METRIC_CATALOG[id].name === name) return id;
	}
	return undefined;
}

function metricLabel(
	workflow: WorkflowJSON,
	agentName: string,
	id: string,
	recommended: string,
): string {
	const name = isMetricId(id) ? METRIC_CATALOG[id].name : id;
	const description = describeMetricForWorkflow(workflow, agentName, id);
	const recommendedSuffix = id === recommended ? ' (recommended)' : '';
	return description
		? `${name}${recommendedSuffix} — ${description}`
		: `${name}${recommendedSuffix}`;
}

// ── Tool factory ───────────────────────────────────────────────────────────

export function createEvalsTool(context: InstanceAiContext) {
	return createTool({
		id: 'evals',
		description:
			"Eval suite orchestration. action='offer' → proactive approve/deny widget after a fresh build. " +
			"action='select-metrics' → multi-select widget for the user to choose canned metrics. " +
			"action='propose' → build the task spec for the eval-setup sub-agent (creates an empty DataTable by default). " +
			"action='offer-data-population' → approve/deny widget after eval setup, asking whether to auto-populate the empty DataTable.",
		inputSchema,
		suspendSchema,
		resumeSchema,
		execute: async (input: Input, ctx: any) => {
			switch (input.action) {
				case 'offer':
					return executeOffer(context, input, ctx);
				case 'select-metrics':
					return executeSelectMetrics(context, input, ctx);
				case 'propose':
					return executePropose(context, input);
				case 'offer-data-population':
					return executeOfferDataPopulation(context, input, ctx);
			}
		},
	});
}

// ── action: offer ──────────────────────────────────────────────────────────

async function executeOffer(
	context: InstanceAiContext,
	input: z.infer<typeof offerAction>,
	ctx: any,
) {
	const resumeData = ctx?.agent?.resumeData as ConfirmResume | undefined;
	const suspend = ctx?.agent?.suspend;

	const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const detection = detectAiNodes(wf);

	if (resumeData !== undefined && resumeData !== null) {
		if (!resumeData.approved) return { eligible: true as const, approved: false as const };
		return {
			eligible: true as const,
			approved: true as const,
			aiNodeNames: detection.aiNodeNames,
		};
	}

	if (!detection.isAiWorkflow) return { eligible: false as const, reason: 'no-ai-nodes' as const };
	if (detection.alreadyConfigured) {
		return { eligible: false as const, reason: 'already-configured' as const };
	}

	// Detect named refs to disclose before approval
	const agentName = detection.aiNodeNames[0];
	const namedRefs = detectAgentNamedRefs(wf, agentName);

	await suspend?.({
		requestId: nanoid(),
		message: composeOfferMessage(detection.aiNodeNames, namedRefs),
		severity: 'info' as const,
	});
	return { eligible: true as const, approved: false as const };
}

// ── action: select-metrics ─────────────────────────────────────────────────

async function executeSelectMetrics(
	context: InstanceAiContext,
	input: z.infer<typeof selectMetricsAction>,
	ctx: any,
) {
	const resumeData = ctx?.agent?.resumeData as QuestionsResume | undefined;
	const suspend = ctx?.agent?.suspend;

	const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const detection = detectAiNodes(wf);
	if (!detection.isAiWorkflow) {
		return { skipped: true as const, reason: 'no-ai-nodes' as const };
	}

	const agentName = detection.aiNodeNames[0];

	if (resumeData !== undefined && resumeData !== null) {
		if (!resumeData.approved || !resumeData.answers) {
			return { chosenMetricIds: ['correctness'], answers: resumeData?.answers ?? [] };
		}
		const selected = resumeData.answers[0]?.selectedOptions ?? [];
		const ids = selected.map(labelToId).filter((x): x is string => x !== undefined);
		return {
			chosenMetricIds: ids.length > 0 ? ids : ['correctness'],
			answers: resumeData.answers,
		};
	}

	const defaults = proposeDefaultMetricIds(wf, agentName);
	const recommended = recommendedMetricId(wf, agentName);
	const allLabels = METRIC_IDS.map((id) => metricLabel(wf, agentName, id, recommended));
	const defaultLabels = defaults.map((id) => METRIC_CATALOG[id].name);

	const questionId = nanoid();
	await suspend?.({
		requestId: nanoid(),
		message: 'Choose evaluation metrics',
		severity: 'info' as const,
		inputType: 'questions' as const,
		questions: [
			{
				id: questionId,
				question: `Choose evaluation metrics (defaults pre-selected: ${defaultLabels.join(', ')})`,
				type: 'multi' as const,
				options: allLabels,
			},
		],
	});
	return { chosenMetricIds: defaults };
}

// ── action: propose ────────────────────────────────────────────────────────

async function executePropose(context: InstanceAiContext, input: z.infer<typeof proposeAction>) {
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

	const agentName = detection.aiNodeNames[0];
	const { inputColumns: directColumns } = analyzeAgentInputColumns(wf, agentName);
	const namedRefs = detectAgentNamedRefs(wf, agentName);
	const namedRefColumns = namedRefs.map((r) => r.column);

	// Combined column list: direct $json refs + named-ref-derived columns.
	const inputColumns = [...new Set([...directColumns, ...namedRefColumns])];

	// metrics may be undefined when sanitizeInputSchema flattens the discriminated union
	let resolvedMetrics = getMetricsByIds(input.metrics ?? []);
	if (resolvedMetrics.length === 0) {
		resolvedMetrics = getMetricsByIds(['correctness']);
	}

	let dataTableId: string | undefined = input.existingDataTableId;
	let datasetChoiceForTask: 'link-existing' | 'later' = 'later';

	// datasetChoice may be undefined when sanitizeInputSchema flattens the
	// discriminated union — treat missing value as the schema default ('create-empty').
	const datasetChoice = input.datasetChoice ?? 'create-empty';

	if (datasetChoice === 'link-existing' && input.existingDataTableId) {
		datasetChoiceForTask = 'link-existing';
	} else if (datasetChoice === 'create-empty') {
		const dt = await createEmptyEvalDataTable(context, {
			workflowName: wf.name ?? 'Workflow',
			projectId: input.projectId,
			columns: inputColumns,
		});
		dataTableId = dt.id;
		datasetChoiceForTask = 'link-existing';
	}

	const task = formatEvalSetupTask({
		workflowId: input.workflowId,
		workflowName: wf.name ?? 'Workflow',
		detectedAiNodes: detection.aiNodeNames,
		datasetChoice: datasetChoiceForTask,
		existingDataTableId: dataTableId,
		projectId: input.projectId,
		suggestedInputColumns: inputColumns,
		suggestedOutputColumns: [],
		enabledMetrics: resolvedMetrics,
		namedRefs,
	});

	return {
		success: true,
		shouldDelegateToEvalSetupAgent: true,
		task,
		workflowId: input.workflowId,
		...(input.projectId ? { projectId: input.projectId } : {}),
		...(dataTableId ? { dataTableId } : {}),
		datasetChoice,
	};
}

// ── action: offer-data-population ──────────────────────────────────────────

async function executeOfferDataPopulation(
	context: InstanceAiContext,
	input: z.infer<typeof offerDataPopulationAction>,
	ctx: any,
) {
	const resumeData = ctx?.agent?.resumeData as ConfirmResume | undefined;
	const suspend = ctx?.agent?.suspend;

	const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const reqs = analyzeEvalDataRequirements(wf);
	const target = reqs.targets[0];
	if (!target) {
		return { skipped: true as const, reason: 'no-eval-target' as const };
	}

	if (resumeData !== undefined && resumeData !== null) {
		if (!resumeData.approved) {
			return { approved: false as const };
		}
		return {
			approved: true as const,
			workflowId: input.workflowId,
			dataTableId: target.dataTableId,
		};
	}

	// Detect already-populated table — sample one row to avoid full scans.
	try {
		const sample = await context.dataTableService.queryRows(target.dataTableId, { limit: 1 });
		if (sample.data.length > 0) {
			return { skipped: true as const, reason: 'already-populated' as const };
		}
	} catch {
		// fall through — assume empty / unknown and continue with the offer
	}

	await suspend?.({
		requestId: nanoid(),
		message: 'Auto-populate the eval DataTable?',
		severity: 'info' as const,
	});
	return { approved: false as const };
}
