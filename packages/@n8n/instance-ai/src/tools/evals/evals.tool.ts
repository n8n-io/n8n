import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { analyzeAgentInputColumns } from './analyze-agent-input-columns.service';
import { applyPinData } from './apply-pin-data.service';
import {
	describeMetricForWorkflow,
	recommendedMetricId,
} from './describe-metric-for-workflow.service';
import { detectAgentNamedRefs, type NamedRef } from './detect-agent-named-refs.service';
import { detectAiNodes } from './detect-ai-nodes';
import { detectToolRefs } from './detect-tool-refs.service';
import { createEmptyEvalDataTable } from './ensure-eval-data-table.service';
import { analyzeEvalDataRequirements } from './eval-data-requirements.service';
import { formatEvalSetupTask } from './format-eval-setup-task';
import { generateToolRefPinData } from './generate-tool-ref-pin-data.service';
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
			'Eligibility precheck. Returns { eligible: false, reason } when the workflow has no AI nodes or already has evals configured, or { eligible: true, aiNodeNames, message } with a ready-to-send chat message you should output verbatim. No widget, no suspend — the user replies in natural chat on the next turn.',
		),
	workflowId: z.string(),
	projectId: z.string().optional(),
});

const recommendMetricAction = z.object({
	action: z
		.literal('recommend-metric')
		.describe(
			'Opinionated single-metric suggestion. Suspends with an approve/deny widget showing the workflow-specific recommended metric. On approval returns `{ approved: true, metricId }` — pass that single id to `propose` and skip `select-metrics`. On denial returns `{ approved: false }` — fall through to `select-metrics` so the user can pick from the full list.',
		),
	workflowId: z.string(),
});

const selectMetricsAction = z.object({
	action: z
		.literal('select-metrics')
		.describe(
			'Multi-select picker over all canned metrics — call this ONLY when `recommend-metric` returned `{ approved: false }`. Returns chosenMetricIds.',
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
		recommendMetricAction,
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
type SuspendPayload = z.infer<typeof suspendSchema>;
type EvalsToolExecutionContext = {
	agent?: {
		resumeData?: unknown;
		suspend?: (payload: SuspendPayload) => Promise<void>;
	};
};

// ── Helpers ────────────────────────────────────────────────────────────────

function composeOfferMessage(aiNodeNames: string[], namedRefs: NamedRef[]): string {
	const subject =
		aiNodeNames.length === 1
			? `This workflow uses AI node \`${aiNodeNames[0]}\`.`
			: `This workflow uses ${aiNodeNames.length} AI nodes.`;
	const baseMessage =
		`${subject} AI answers can change unpredictably when you tweak prompts, models, or data — ` +
		"even small edits can break behavior you weren't planning to change. " +
		'Test cases let you re-run your workflow against a fixed set of inputs and check the answers stay correct over time. ' +
		'Want to add some?';

	if (namedRefs.length === 0) return baseMessage;

	// Disclosure: cite which named nodes will move and into which dataset columns.
	const sourceNodes = [...new Set(namedRefs.map((r) => r.nodeName))]
		.map((n) => `\`${n}\``)
		.join(', ');
	const targetColumns = namedRefs.map((r) => `\`${r.column}\``).join(', ');

	const sourceLabel = namedRefs.length === 1 ? 'node' : 'nodes';

	return (
		`${baseMessage}\n\n` +
		`Setting this up will adjust your workflow slightly: the agent currently reads from ${sourceLabel} ${sourceNodes}, ` +
		`and I'll route that data through the test inputs (columns ${targetColumns}) using a small Set node. ` +
		'Your live behavior stays the same.'
	);
}

function hasResumeData(ctx: EvalsToolExecutionContext): boolean {
	const resumeData = ctx.agent?.resumeData;
	return resumeData !== undefined && resumeData !== null;
}

function getConfirmResume(ctx: EvalsToolExecutionContext): ConfirmResume | undefined {
	const resumeData = ctx.agent?.resumeData;
	if (resumeData === undefined || resumeData === null) return undefined;
	const parsed = confirmResumeSchema.safeParse(resumeData);
	return parsed.success ? parsed.data : undefined;
}

function getQuestionsResume(ctx: EvalsToolExecutionContext): QuestionsResume | undefined {
	const resumeData = ctx.agent?.resumeData;
	if (resumeData === undefined || resumeData === null) return undefined;
	const parsed = questionsResumeSchema.safeParse(resumeData);
	return parsed.success ? parsed.data : undefined;
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
			"Eval suite orchestration. action='offer' → eligibility precheck after a fresh build; when eligible, returns a chat message you must output verbatim and then end the turn so the user can reply naturally. " +
			"action='recommend-metric' → opinionated single-metric suggestion; suspends with approve/deny. Call FIRST when choosing metrics. " +
			"action='select-metrics' → multi-select picker; call ONLY when `recommend-metric` was denied. " +
			"action='propose' → build the task spec for the eval-setup sub-agent (creates an empty DataTable by default). " +
			"action='offer-data-population' → approve/deny widget after eval setup, asking whether to auto-populate the empty DataTable.",
		inputSchema,
		suspendSchema,
		resumeSchema,
		execute: async (input: Input, ctx: EvalsToolExecutionContext) => {
			switch (input.action) {
				case 'offer':
					return await executeOffer(context, input);
				case 'recommend-metric':
					return await executeRecommendMetric(context, input, ctx);
				case 'select-metrics':
					return await executeSelectMetrics(context, input, ctx);
				case 'propose':
					return await executePropose(context, input);
				case 'offer-data-population':
					return await executeOfferDataPopulation(context, input, ctx);
			}
		},
	});
}

// ── action: offer ──────────────────────────────────────────────────────────

async function executeOffer(context: InstanceAiContext, input: z.infer<typeof offerAction>) {
	const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const detection = detectAiNodes(wf);

	if (!detection.isAiWorkflow) return { eligible: false as const, reason: 'no-ai-nodes' as const };
	if (detection.alreadyConfigured) {
		return { eligible: false as const, reason: 'already-configured' as const };
	}

	const agentName = detection.aiNodeNames[0];
	const namedRefs = detectAgentNamedRefs(wf, agentName);

	return {
		eligible: true as const,
		aiNodeNames: detection.aiNodeNames,
		message: composeOfferMessage(detection.aiNodeNames, namedRefs),
	};
}

// ── action: recommend-metric ───────────────────────────────────────────────

function composeRecommendMessage(
	workflow: WorkflowJSON,
	agentName: string,
	metricId: string,
): string {
	const name = isMetricId(metricId) ? METRIC_CATALOG[metricId].name : metricId;
	const description = describeMetricForWorkflow(workflow, agentName, metricId);
	const body = description ? `**${name}** — ${description}.` : `**${name}**.`;
	return (
		`Based on this workflow, I'd measure ${body} ` +
		'Sound good? Approve to use it, or deny to pick a different metric from the full list.'
	);
}

async function executeRecommendMetric(
	context: InstanceAiContext,
	input: z.infer<typeof recommendMetricAction>,
	ctx: EvalsToolExecutionContext,
) {
	const resumeData = getConfirmResume(ctx);
	const suspend = ctx.agent?.suspend;

	const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const detection = detectAiNodes(wf);
	if (!detection.isAiWorkflow) {
		return { skipped: true as const, reason: 'no-ai-nodes' as const };
	}

	const agentName = detection.aiNodeNames[0];
	const metricId = recommendedMetricId(wf, agentName);

	if (hasResumeData(ctx)) {
		if (resumeData?.approved) {
			return { approved: true as const, metricId };
		}
		return { approved: false as const };
	}

	await suspend?.({
		requestId: nanoid(),
		message: composeRecommendMessage(wf, agentName, metricId),
		severity: 'info' as const,
	});
	return { approved: false as const };
}

// ── action: select-metrics ─────────────────────────────────────────────────

async function executeSelectMetrics(
	context: InstanceAiContext,
	input: z.infer<typeof selectMetricsAction>,
	ctx: EvalsToolExecutionContext,
) {
	const resumeData = getQuestionsResume(ctx);
	const suspend = ctx.agent?.suspend;

	const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const detection = detectAiNodes(wf);
	if (!detection.isAiWorkflow) {
		return { skipped: true as const, reason: 'no-ai-nodes' as const };
	}

	const agentName = detection.aiNodeNames[0];

	if (hasResumeData(ctx)) {
		if (resumeData === undefined || !resumeData.approved || !resumeData.answers) {
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
		message: 'Pick what to measure',
		severity: 'info' as const,
		inputType: 'questions' as const,
		questions: [
			{
				id: questionId,
				question: `Pick what you'd like to measure on each test case (defaults pre-selected: ${defaultLabels.join(', ')})`,
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

	// Resolve sub-component refs (tool/memory/...) via pinData on their source
	// nodes. The LLM generates one fixture per source node; we write it to the
	// workflow JSON. This shadows the production-adapter rewrite for those
	// refs, so they're subtracted from `namedRefs` before formatting the task.
	const toolRefs = detectToolRefs(wf, agentName);
	let pinDataCoveredSources = new Set<string>();
	if (toolRefs.length > 0) {
		const generated = await generateToolRefPinData({
			workflow: wf,
			agentNodeName: agentName,
			refs: toolRefs,
		});
		const patched = applyPinData(wf, generated);
		if (patched !== wf) {
			await context.workflowService.updateFromWorkflowJSON(input.workflowId, patched, {
				...(input.projectId ? { projectId: input.projectId } : {}),
			});
			pinDataCoveredSources = new Set(Object.keys(generated));
		}
	}
	const filteredNamedRefs = namedRefs.filter(
		(r) => !(r.targetNodeName !== agentName && pinDataCoveredSources.has(r.nodeName)),
	);
	const namedRefColumns = filteredNamedRefs.map((r) => r.column);

	// Combined column list: direct $json refs + named-ref-derived columns.
	const inputColumns = [...new Set([...directColumns, ...namedRefColumns])];

	// metrics may be undefined when sanitizeInputSchema flattens the discriminated union
	let resolvedMetrics = getMetricsByIds(input.metrics ?? []);
	if (resolvedMetrics.length === 0) {
		resolvedMetrics = getMetricsByIds(['correctness']);
	}

	let dataTableId: string | undefined = input.existingDataTableId;
	let createdTable: { id: string; name: string; projectId?: string } | undefined;
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
		createdTable = dt;
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
		namedRefs: filteredNamedRefs,
	});

	return {
		success: true,
		shouldDelegateToEvalSetupAgent: true,
		task,
		workflowId: input.workflowId,
		...(input.projectId ? { projectId: input.projectId } : {}),
		...(dataTableId ? { dataTableId } : {}),
		// `table` lets the artifacts panel pick up the newly created DataTable
		// (registry's "Singular data table" extraction path). Only set on the
		// create-empty path — link-existing reuses a table the user already
		// has, so we don't claim it as a produced artifact. projectId comes
		// from the DataTable service (not just input.projectId) so the preview
		// can fetch the table even when the caller didn't pass projectId.
		...(createdTable
			? {
					table: {
						id: createdTable.id,
						name: createdTable.name,
						...((createdTable.projectId ?? input.projectId)
							? { projectId: createdTable.projectId ?? input.projectId }
							: {}),
					},
				}
			: {}),
		datasetChoice,
	};
}

// ── action: offer-data-population ──────────────────────────────────────────

async function executeOfferDataPopulation(
	context: InstanceAiContext,
	input: z.infer<typeof offerDataPopulationAction>,
	ctx: EvalsToolExecutionContext,
) {
	const resumeData = getConfirmResume(ctx);
	const suspend = ctx.agent?.suspend;

	const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const reqs = analyzeEvalDataRequirements(wf);
	const target = reqs.targets[0];
	if (!target) {
		return { skipped: true as const, reason: 'no-eval-target' as const };
	}

	if (hasResumeData(ctx)) {
		if (!resumeData?.approved) {
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
		message: 'Generate some sample test inputs to get you started?',
		severity: 'info' as const,
	});
	return { approved: false as const };
}
