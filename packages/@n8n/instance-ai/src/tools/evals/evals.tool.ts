import { Tool } from '@n8n/agents';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import {
	analyzeAgentEvalInputColumns,
	detectAgentEvalInputRefs,
} from './analyze-agent-input-columns.service';
import { describeMetricForWorkflow } from './describe-metric-for-workflow.service';
import { detectAgentNamedRefs, type NamedRef } from './detect-agent-named-refs.service';
import { detectAiNodes, type DetectAiNodesResult } from './detect-ai-nodes';
import {
	createEmptyEvalDataTable,
	formatEvalDataTableColumnNameMap,
} from './ensure-eval-data-table.service';
import {
	analyzeEvalDataRequirements,
	resolveEvalDataTarget,
} from './eval-data-requirements.service';
import { formatEvalSetupTask } from './format-eval-setup-task';
import {
	METRIC_CATALOG,
	METRIC_IDS,
	getMetricsByIds,
	getMetricDatasetColumns,
	type MetricId,
} from './metric-catalog';
import { populateEvalDataTable } from './populate-eval-data-table.service';
import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../../types';

// ── Action input schemas ───────────────────────────────────────────────────

const metricIdSchema = z.enum(METRIC_IDS);

const offerAction = z.object({
	action: z
		.literal('offer')
		.describe(
			'Eligibility precheck. Returns { eligible: false, reason } when the workflow has no AI nodes or already has evals configured, or { eligible: true, aiNodeNames, message } with a ready-to-send chat message you should output verbatim. No widget, no suspend — the user replies in natural chat on the next turn.',
		),
	workflowId: z.string(),
	projectId: z.string().optional(),
	targetAgentNodeName: z
		.string()
		.optional()
		.describe('Required when the workflow has more than one AI node.'),
});

const recommendMetricAction = z.object({
	action: z
		.literal('recommend-metric')
		.describe(
			'Ask the user to approve metricId. On approval pass it to propose; on denial use select-metrics.',
		),
	workflowId: z.string(),
	metricId: metricIdSchema.describe('Metric chosen by the orchestration agent.'),
	targetAgentNodeName: z
		.string()
		.optional()
		.describe('Required when the workflow has more than one AI node.'),
});

const selectMetricsAction = z.object({
	action: z
		.literal('select-metrics')
		.describe(
			'Multi-select picker over all canned metrics — call this ONLY when `recommend-metric` returned `{ approved: false }`. Returns chosenMetricIds.',
		),
	workflowId: z.string(),
	recommendedMetricId: metricIdSchema.optional().describe('Metric to mark as recommended.'),
	targetAgentNodeName: z
		.string()
		.optional()
		.describe('Required when the workflow has more than one AI node.'),
});

const proposeAction = z.object({
	action: z
		.literal('propose')
		.describe('Build the eval-setup task spec and create or link the eval DataTable.'),
	workflowId: z.string(),
	projectId: z.string().optional(),
	metrics: z.array(z.string()).default([]),
	datasetChoice: z.enum(['create-empty', 'link-existing', 'later']).default('create-empty'),
	existingDataTableId: z.string().optional(),
	targetAgentNodeName: z
		.string()
		.optional()
		.describe('Required when the workflow has more than one AI node.'),
});

const offerDataPopulationAction = z.object({
	action: z
		.literal('offer-data-population')
		.describe(
			'Ask whether to populate the eval DataTable; on approval, insert rows and return a summary.',
		),
	workflowId: z.string(),
	projectId: z.string().optional(),
	targetAgentNodeName: z
		.string()
		.optional()
		.describe('Required when the workflow has more than one AI node.'),
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
	resumeData?: unknown;
	suspend?: (payload: SuspendPayload) => Promise<never> | Promise<void>;
	agent?: {
		resumeData?: unknown;
		suspend?: (payload: SuspendPayload) => Promise<never> | Promise<void>;
	};
};

// ── Helpers ────────────────────────────────────────────────────────────────

function composeOfferMessage(aiNodeNames: string[], namedRefs: NamedRef[]): string {
	const subject =
		aiNodeNames.length === 1
			? `This workflow uses AI node ${aiNodeNames[0]}.`
			: `This workflow uses ${aiNodeNames.length} AI nodes.`;
	const baseMessage =
		`${subject} AI answers can change unpredictably when you tweak prompts, models, or data — ` +
		"even small edits can break behavior you weren't planning to change. " +
		'Test cases let you re-run your workflow against a fixed set of inputs and check the answers stay correct over time. ' +
		'Want to add some?';

	if (namedRefs.length === 0) return baseMessage;

	// Disclosure: cite which named nodes will move and into which dataset columns.
	const sourceNodes = [...new Set(namedRefs.map((r) => r.nodeName))].join(', ');
	const targetColumns = namedRefs.map((r) => r.column).join(', ');

	const sourceLabel = namedRefs.length === 1 ? 'node' : 'nodes';

	return (
		`${baseMessage}\n\n` +
		`Setting this up will adjust your workflow slightly: the agent currently reads from ${sourceLabel} ${sourceNodes}, ` +
		`and I'll route that data through the test inputs (columns ${targetColumns}) using a small Set node. ` +
		'Your live behavior stays the same.'
	);
}

function hasResumeData(ctx: EvalsToolExecutionContext): boolean {
	const resumeData = getResumeData(ctx);
	return resumeData !== undefined && resumeData !== null;
}

function getResumeData(ctx: EvalsToolExecutionContext): unknown {
	return ctx.resumeData ?? ctx.agent?.resumeData;
}

function getSuspend(ctx: EvalsToolExecutionContext) {
	return ctx.suspend ?? ctx.agent?.suspend;
}

function getConfirmResume(ctx: EvalsToolExecutionContext): ConfirmResume | undefined {
	const resumeData = getResumeData(ctx);
	if (resumeData === undefined || resumeData === null) return undefined;
	const parsed = confirmResumeSchema.safeParse(resumeData);
	return parsed.success ? parsed.data : undefined;
}

function getQuestionsResume(ctx: EvalsToolExecutionContext): QuestionsResume | undefined {
	const resumeData = getResumeData(ctx);
	if (resumeData === undefined || resumeData === null) return undefined;
	const parsed = questionsResumeSchema.safeParse(resumeData);
	return parsed.success ? parsed.data : undefined;
}

function isMetricId(id: string): id is MetricId {
	return (METRIC_IDS as readonly string[]).includes(id);
}

function metricNameOnly(label: string): string {
	// Strip " — description" if present.
	const dashIndex = label.indexOf(' — ');
	const name = dashIndex >= 0 ? label.slice(0, dashIndex) : label;
	// Strip " (recommended)" suffix if present.
	return name.replace(/\s*\(recommended\)\s*$/i, '');
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
	recommended: string | undefined,
): string {
	const name = isMetricId(id) ? METRIC_CATALOG[id].name : id;
	const description = describeMetricForWorkflow(workflow, agentName, id);
	const recommendedSuffix = id === recommended ? ' (recommended)' : '';
	return description
		? `${name}${recommendedSuffix} — ${description}`
		: `${name}${recommendedSuffix}`;
}

type TargetAgentResolution =
	| { ok: true; agentName: string }
	| {
			ok: false;
			reason: 'target-agent-required' | 'target-agent-not-found';
			aiNodeNames: string[];
			message: string;
	  };

function composeTargetAgentMessage(
	aiNodeNames: string[],
	targetAgentNodeName: string | undefined,
): string {
	const list = aiNodeNames.join(', ');
	if (targetAgentNodeName) {
		return `I couldn't find AI node ${targetAgentNodeName}. Pick one of these AI nodes to set up test cases for: ${list}.`;
	}
	return `This workflow has multiple AI nodes: ${list}. Which AI node should I set up test cases for?`;
}

function resolveTargetAgent(
	detection: DetectAiNodesResult,
	targetAgentNodeName: string | undefined,
): TargetAgentResolution {
	if (targetAgentNodeName) {
		if (detection.aiNodeNames.includes(targetAgentNodeName)) {
			return { ok: true, agentName: targetAgentNodeName };
		}
		return {
			ok: false,
			reason: 'target-agent-not-found',
			aiNodeNames: detection.aiNodeNames,
			message: composeTargetAgentMessage(detection.aiNodeNames, targetAgentNodeName),
		};
	}

	const [onlyAgentName] = detection.aiNodeNames;
	if (detection.aiNodeNames.length === 1 && onlyAgentName) {
		return { ok: true, agentName: onlyAgentName };
	}

	return {
		ok: false,
		reason: 'target-agent-required',
		aiNodeNames: detection.aiNodeNames,
		message: composeTargetAgentMessage(detection.aiNodeNames, undefined),
	};
}

function targetAgentSkippedResponse(resolution: Exclude<TargetAgentResolution, { ok: true }>) {
	return {
		skipped: true as const,
		reason: resolution.reason,
		aiNodeNames: resolution.aiNodeNames,
		message: resolution.message,
	};
}

// ── Tool factory ───────────────────────────────────────────────────────────

export function createEvalsTool(context: InstanceAiContext) {
	return new Tool('evals')
		.description(
			"Eval suite orchestration. action='offer' → eligibility precheck after a fresh build; when eligible, returns a chat message you must output verbatim and then end the turn so the user can reply naturally. " +
				"action='recommend-metric' → approve/deny widget for the metricId chosen by the caller. Call FIRST when choosing metrics. " +
				"action='select-metrics' → multi-select picker; call ONLY when `recommend-metric` was denied. " +
				"action='propose' → build the task spec for the eval-setup sub-agent and create or link the DataTable. " +
				"action='offer-data-population' → ask whether to populate the DataTable after setup.",
		)
		.input(inputSchema)
		.suspend(suspendSchema)
		.resume(resumeSchema)
		.handler(async (input: Input, ctx) => {
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
		})
		.build();
}

// ── action: offer ──────────────────────────────────────────────────────────

async function executeOffer(context: InstanceAiContext, input: z.infer<typeof offerAction>) {
	const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const detection = detectAiNodes(wf);

	if (!detection.isAiWorkflow) return { eligible: false as const, reason: 'no-ai-nodes' as const };
	if (detection.alreadyConfigured) {
		return { eligible: false as const, reason: 'already-configured' as const };
	}

	const target = resolveTargetAgent(detection, input.targetAgentNodeName);
	if (!target.ok) {
		return {
			eligible: true as const,
			requiresTargetAgentSelection: true as const,
			reason: target.reason,
			aiNodeNames: target.aiNodeNames,
			message: target.message,
		};
	}

	const agentName = target.agentName;
	const namedRefs = detectAgentNamedRefs(wf, agentName);

	return {
		eligible: true as const,
		aiNodeNames: detection.aiNodeNames,
		targetAgentNodeName: agentName,
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
	const suspend = getSuspend(ctx);

	const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const detection = detectAiNodes(wf);
	if (!detection.isAiWorkflow) {
		return { skipped: true as const, reason: 'no-ai-nodes' as const };
	}

	const target = resolveTargetAgent(detection, input.targetAgentNodeName);
	if (!target.ok) return targetAgentSkippedResponse(target);

	const agentName = target.agentName;
	const metricId = input.metricId;

	if (hasResumeData(ctx)) {
		if (resumeData?.approved) {
			return { approved: true as const, metricId };
		}
		return { approved: false as const };
	}

	if (suspend) {
		return await suspend({
			requestId: nanoid(),
			message: composeRecommendMessage(wf, agentName, metricId),
			severity: 'info' as const,
		});
	}
	return { approved: false as const };
}

// ── action: select-metrics ─────────────────────────────────────────────────

async function executeSelectMetrics(
	context: InstanceAiContext,
	input: z.infer<typeof selectMetricsAction>,
	ctx: EvalsToolExecutionContext,
) {
	const resumeData = getQuestionsResume(ctx);
	const suspend = getSuspend(ctx);

	const wf = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const detection = detectAiNodes(wf);
	if (!detection.isAiWorkflow) {
		return { skipped: true as const, reason: 'no-ai-nodes' as const };
	}

	const target = resolveTargetAgent(detection, input.targetAgentNodeName);
	if (!target.ok) return targetAgentSkippedResponse(target);

	const agentName = target.agentName;

	if (hasResumeData(ctx)) {
		if (resumeData === undefined || !resumeData.approved || !resumeData.answers) {
			return { chosenMetricIds: [], answers: resumeData?.answers ?? [] };
		}
		const selected = resumeData.answers[0]?.selectedOptions ?? [];
		const ids = selected.map(labelToId).filter((x): x is string => x !== undefined);
		return {
			chosenMetricIds: ids,
			answers: resumeData.answers,
		};
	}

	const recommended = input.recommendedMetricId;
	const allLabels = METRIC_IDS.map((id) => metricLabel(wf, agentName, id, recommended));
	const recommendationText = recommended
		? ` Suggested metric: ${METRIC_CATALOG[recommended].name}.`
		: '';

	const questionId = nanoid();
	if (suspend) {
		return await suspend({
			requestId: nanoid(),
			message: 'Pick what to measure',
			severity: 'info' as const,
			inputType: 'questions' as const,
			questions: [
				{
					id: questionId,
					question: `Pick what you'd like to measure on each test case.${recommendationText}`,
					type: 'multi' as const,
					options: allLabels,
				},
			],
		});
	}
	return { chosenMetricIds: [] };
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

	const target = resolveTargetAgent(detection, input.targetAgentNodeName);
	if (!target.ok) return targetAgentSkippedResponse(target);

	// datasetChoice may be undefined when sanitizeInputSchema flattens the
	// discriminated union — treat missing value as the schema default ('create-empty').
	const datasetChoice = input.datasetChoice ?? 'create-empty';
	if (datasetChoice === 'link-existing' && !input.existingDataTableId) {
		return { skipped: true as const, reason: 'existing-data-table-id-required' as const };
	}

	const agentName = target.agentName;
	const { inputColumns: directColumns } = analyzeAgentEvalInputColumns(wf, agentName);
	const directRefs = detectAgentEvalInputRefs(wf, agentName);
	const namedRefs = detectAgentNamedRefs(wf, agentName);
	const namedRefColumns = namedRefs.map((r) => r.column);

	const inputColumns = [...new Set([...directColumns, ...namedRefColumns])];

	const resolvedMetrics = getMetricsByIds(input.metrics ?? []);
	if (resolvedMetrics.length === 0) {
		return { skipped: true as const, reason: 'metrics-required' as const };
	}
	const outputColumns = getMetricDatasetColumns(resolvedMetrics);
	const dataTableColumns = [...new Set([...inputColumns, ...outputColumns])];
	const normalizedColumnNames =
		datasetChoice === 'create-empty'
			? formatEvalDataTableColumnNameMap(dataTableColumns)
			: undefined;
	const normalizeColumn = (column: string) => normalizedColumnNames?.get(column) ?? column;
	const taskInputColumns = inputColumns.map(normalizeColumn);
	const taskOutputColumns = outputColumns.map(normalizeColumn);
	const taskNamedRefs = namedRefs.map((ref) => ({ ...ref, column: normalizeColumn(ref.column) }));
	const taskDirectRefs = directRefs.map((ref) => ({ ...ref, column: normalizeColumn(ref.column) }));

	let dataTableId: string | undefined = input.existingDataTableId;
	let createdTable: { id: string; name: string; projectId?: string } | undefined;
	let datasetChoiceForTask: 'link-existing' | 'later' = 'later';

	if (datasetChoice === 'link-existing' && input.existingDataTableId) {
		datasetChoiceForTask = 'link-existing';
	} else if (datasetChoice === 'create-empty') {
		const dt = await createEmptyEvalDataTable(context, {
			workflowName: wf.name ?? 'Workflow',
			projectId: input.projectId,
			columns: dataTableColumns,
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
		suggestedInputColumns: taskInputColumns,
		suggestedOutputColumns: taskOutputColumns,
		enabledMetrics: resolvedMetrics,
		directRefs: taskDirectRefs,
		namedRefs: taskNamedRefs,
		targetAgentNodeName: agentName,
	});

	return {
		success: true,
		shouldDelegateToEvalSetupAgent: true,
		task,
		workflowId: input.workflowId,
		targetAgentNodeName: agentName,
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

async function executeOfferDataPopulation(
	context: InstanceAiContext,
	input: z.infer<typeof offerDataPopulationAction>,
	ctx: EvalsToolExecutionContext,
) {
	const workflow = await context.workflowService.getAsWorkflowJSON(input.workflowId);
	const requirements = analyzeEvalDataRequirements(workflow, input.targetAgentNodeName);
	const target = resolveEvalDataTarget(requirements, input.targetAgentNodeName);

	if (!target) {
		return {
			approved: false as const,
			skipped: true as const,
			reason:
				requirements.reason ??
				(input.targetAgentNodeName
					? `No test-case table is wired for AI node "${input.targetAgentNodeName}".`
					: 'No test-case table is wired for this workflow.'),
		};
	}

	if (hasResumeData(ctx)) {
		const resumeData = getConfirmResume(ctx);
		if (!resumeData?.approved) return { approved: false as const };
		const targetAiNodeName = target.targetAgentNodeName ?? target.targetNodeName;
		return {
			approved: true as const,
			workflowId: input.workflowId,
			...(targetAiNodeName ? { targetAgentNodeName: targetAiNodeName } : {}),
			...(await populateEvalDataTable(context, {
				workflowId: input.workflowId,
				...(input.projectId ? { projectId: input.projectId } : {}),
				...(targetAiNodeName ? { targetAgentNodeName: targetAiNodeName } : {}),
			})),
		};
	}

	const suspend = getSuspend(ctx);
	if (suspend) {
		return await suspend({
			requestId: nanoid(),
			message: 'I can add sample test cases to the table now. Want me to populate it?',
			severity: 'info' as const,
		});
	}

	return { approved: false as const };
}
