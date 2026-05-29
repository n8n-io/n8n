#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Pairwise-style eval CLI for Instance AI workflow building.
//
// This keeps the historical pairwise CLI/output contract while routing builds
// through the main Instance AI orchestrator. Prompt-only examples from the
// LangSmith pairwise dataset are wrapped as workflow eval cases; local workflow
// fixtures can also be selected with --filter.
// ---------------------------------------------------------------------------

import { Client as LangSmithClient } from 'langsmith';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import pLimit from 'p-limit';

import { loadRuns, renderDocument } from './report';
import { N8nClient, type WorkflowResponse } from '../clients/n8n-client';
import { seedCredentials, cleanupCredentials } from '../credentials/seeder';
import { loadWorkflowTestCasesWithFiles, type WorkflowTestCaseWithFile } from '../data/workflows';
import { createLogger, type EvalLogger } from '../harness/logger';
import { runWorkflowTestCase } from '../harness/runner';
import { snapshotWorkflowIds } from '../outcome/workflow-discovery';
import type {
	ConversationMetrics,
	ExecutionScenarioResult,
	ToolInteraction,
	TranscriptTurn,
	WorkflowTestCase,
	WorkflowTestCaseResult,
} from '../types';

const DEFAULT_DATASET = 'instance-ai-builder-from-plans';
const MAX_CONCURRENT_BUILDS = 4;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface PairwiseArgs {
	dataset: string;
	judges: number;
	iterations: number;
	concurrency: number;
	maxExamples?: number;
	exampleIds?: Set<string>;
	examplesJsonl?: string;
	timeoutMs: number;
	outputDir: string;
	judgeModel: string;
	experimentName: string;
	baseUrl: string;
	email?: string;
	password?: string;
	filter?: string;
	exclude?: string;
	keepWorkflows: boolean;
	verbose: boolean;
	useLocalWorkflows: boolean;
}

function parseArgs(argv: string[]): PairwiseArgs {
	const get = (flag: string): string | undefined => {
		const idx = argv.indexOf(flag);
		if (idx === -1) return undefined;
		const value = argv[idx + 1];
		return value && !value.startsWith('--') ? value : undefined;
	};
	const has = (flag: string): boolean => argv.includes(flag);

	if (has('--help') || has('-h')) {
		printHelp();
		process.exit(0);
	}

	const iso = new Date().toISOString().replace(/[:.]/g, '-');
	const defaultOutputDir = path.resolve(process.cwd(), '.output', 'pairwise', iso);

	const exampleIdsFile = get('--example-ids-file');
	let exampleIds: Set<string> | undefined;
	if (exampleIdsFile) {
		const content = readFileSync(exampleIdsFile, 'utf8');
		const ids = content
			.split('\n')
			.map((s) => s.trim())
			.filter((s) => s.length > 0 && !s.startsWith('#'));
		exampleIds = new Set(ids);
	}

	const filter = get('--filter');

	return {
		dataset: get('--dataset') ?? DEFAULT_DATASET,
		judges: parsePositiveInt(get('--judges'), '--judges') ?? 1,
		iterations: parsePositiveInt(get('--iterations'), '--iterations') ?? 1,
		concurrency: parsePositiveInt(get('--concurrency'), '--concurrency') ?? MAX_CONCURRENT_BUILDS,
		maxExamples: parsePositiveInt(get('--max-examples'), '--max-examples'),
		exampleIds,
		examplesJsonl: get('--examples-jsonl'),
		timeoutMs: parsePositiveNumber(get('--timeout-ms'), '--timeout-ms') ?? 900_000,
		outputDir: get('--output-dir') ?? defaultOutputDir,
		judgeModel: get('--judge-model') ?? 'orchestrator-verifier',
		experimentName: get('--experiment-name') ?? 'pairwise-evals-instance-ai',
		baseUrl: get('--base-url') ?? process.env.N8N_EVAL_BASE_URL ?? 'http://localhost:5678',
		email: get('--email'),
		password: get('--password'),
		filter,
		exclude: get('--exclude'),
		keepWorkflows: has('--keep-workflows'),
		verbose: has('--verbose'),
		useLocalWorkflows: has('--local-workflows') || filter !== undefined,
	};
}

function printHelp(): void {
	console.log(`Instance AI pairwise eval compatibility runner

Usage:
  pnpm eval:pairwise [flags]

Default mode reads the historical LangSmith dataset:
  --dataset <name>              Dataset name (default: ${DEFAULT_DATASET})
  --examples-jsonl <path>       Re-run prompts from an existing results.jsonl
  --example-ids-file <path>     Newline-delimited example ids to include

Local workflow fixture mode:
  --filter <substring[,..]>     Run matching evaluations/data/workflows/*.json
  --exclude <substring[,..]>    Exclude matching workflow fixtures
  --local-workflows             Run local workflow fixtures without a filter

Common:
  --base-url <url>              n8n URL (default: http://localhost:5678)
  --email <email>               n8n login email (or N8N_EVAL_EMAIL)
  --password <password>         n8n login password (or N8N_EVAL_PASSWORD)
  --iterations <n>              Fresh build count per example
  --concurrency <n>             Build concurrency (capped at ${MAX_CONCURRENT_BUILDS})
  --timeout-ms <n>              Per-build timeout
  --output-dir <path>           Output directory
  --max-examples <n>            Limit selected examples
  --keep-workflows              Leave built workflows in n8n
  --verbose                     Verbose logging
`);
}

function parsePositiveInt(raw: string | undefined, name: string): number | undefined {
	if (raw === undefined || raw === '') return undefined;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
		throw new Error(`${name} must be a positive integer, got "${raw}".`);
	}
	return n;
}

function parsePositiveNumber(raw: string | undefined, name: string): number | undefined {
	if (raw === undefined || raw === '') return undefined;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0) {
		throw new Error(`${name} must be a positive number, got "${raw}".`);
	}
	return n;
}

// ---------------------------------------------------------------------------
// Dataset loading
// ---------------------------------------------------------------------------

interface DatasetExample {
	id: string;
	prompt: string;
	dos?: string;
	donts?: string;
	testCase: WorkflowTestCase;
}

async function loadExamples(args: PairwiseArgs, logger: EvalLogger): Promise<DatasetExample[]> {
	if (args.examplesJsonl) {
		return examplesToWorkflowCases(loadExamplesFromJsonl(args.examplesJsonl, logger));
	}

	if (args.useLocalWorkflows) {
		const fixtures = loadWorkflowTestCasesWithFiles(args.filter, args.exclude);
		logger.info(`Loaded ${String(fixtures.length)} local workflow fixture(s)`);
		return fixtures.map(workflowFixtureToExample);
	}

	if (!process.env.LANGSMITH_API_KEY) {
		throw new Error(
			'LANGSMITH_API_KEY is required for dataset mode. Pass --filter workflow-builder- or --local-workflows to run local workflow fixtures instead.',
		);
	}

	logger.info(`Fetching dataset "${args.dataset}" from LangSmith`);
	const lsClient = new LangSmithClient();
	const examples: Array<Omit<DatasetExample, 'testCase'>> = [];
	const layoutCounts = { evals: 0, context: 0, none: 0 };
	for await (const raw of lsClient.listExamples({ datasetName: args.dataset })) {
		const inputs = isRecord(raw.inputs) ? raw.inputs : {};
		let criteria: Record<string, unknown> = {};
		if (isRecord(inputs.evals)) {
			criteria = inputs.evals;
			layoutCounts.evals++;
		} else if (isRecord(inputs.context)) {
			criteria = inputs.context;
			layoutCounts.context++;
		} else {
			layoutCounts.none++;
		}
		const example = {
			id: raw.id,
			prompt: typeof inputs.prompt === 'string' ? inputs.prompt : '',
			dos: typeof criteria.dos === 'string' ? criteria.dos : undefined,
			donts: typeof criteria.donts === 'string' ? criteria.donts : undefined,
		};
		if (!example.prompt) {
			logger.warn(`Skipping example ${raw.id}: no prompt field`);
			continue;
		}
		examples.push(example);
	}
	logger.verbose(
		`Dataset criteria layout: evals=${String(layoutCounts.evals)} context=${String(layoutCounts.context)} none=${String(layoutCounts.none)}`,
	);
	return examplesToWorkflowCases(examples);
}

function loadExamplesFromJsonl(
	filePath: string,
	logger: EvalLogger,
): Array<Omit<DatasetExample, 'testCase'>> {
	const absolute = path.resolve(filePath);
	logger.info(`Loading examples from local JSONL: ${absolute}`);
	const content = readFileSync(absolute, 'utf8');
	const examples: Array<Omit<DatasetExample, 'testCase'>> = [];
	const seen = new Set<string>();
	let row = 0;
	for (const line of content.split('\n')) {
		row++;
		const trimmed = line.trim();
		if (!trimmed) continue;
		let parsed: unknown;
		try {
			parsed = JSON.parse(trimmed);
		} catch (error) {
			logger.warn(`Skipping JSONL row ${String(row)}: invalid JSON (${formatError(error)})`);
			continue;
		}
		if (!isRecord(parsed)) continue;
		const id = typeof parsed.exampleId === 'string' ? parsed.exampleId : '';
		const prompt = typeof parsed.prompt === 'string' ? parsed.prompt : '';
		if (!id || !prompt) {
			logger.warn(`Skipping JSONL row ${String(row)}: missing exampleId or prompt`);
			continue;
		}
		if (seen.has(id)) continue;
		seen.add(id);
		examples.push({
			id,
			prompt,
			dos: typeof parsed.dos === 'string' ? parsed.dos : undefined,
			donts: typeof parsed.donts === 'string' ? parsed.donts : undefined,
		});
	}
	logger.info(`Loaded ${String(examples.length)} unique example(s) from ${absolute}`);
	return examples;
}

function examplesToWorkflowCases(
	examples: Array<Omit<DatasetExample, 'testCase'>>,
): DatasetExample[] {
	return examples.map((example) => ({
		...example,
		testCase: {
			conversation: [{ role: 'user', text: example.prompt }],
			complexity: 'medium',
			tags: ['build', 'pairwise'],
			executionScenarios: [
				{
					name: 'pairwise-checklist',
					description: 'Verify the workflow against the pairwise checklist.',
					dataSetup:
						'Use realistic mocked data appropriate for the workflow. If the workflow is not executable because the prompt only asks for structure, inspect the workflow shape and configured node parameters.',
					successCriteria: pairwiseSuccessCriteria(example),
				},
			],
		},
	}));
}

function workflowFixtureToExample(fixture: WorkflowTestCaseWithFile): DatasetExample {
	const prompt =
		fixture.testCase.conversation
			.map((turn) => `${turn.role}: ${turn.text}`)
			.join('\n\n')
			.trim() || fixture.fileSlug;
	const criteria = fixture.testCase.executionScenarios
		.map((scenario) => `${scenario.name}: ${scenario.successCriteria}`)
		.join('\n\n');
	return {
		id: fixture.fileSlug,
		prompt,
		dos: criteria || undefined,
		testCase: fixture.testCase,
	};
}

function pairwiseSuccessCriteria(example: Omit<DatasetExample, 'testCase'>): string {
	const parts = [
		'The built workflow must satisfy the user prompt.',
		example.dos ? `Must do:\n${example.dos}` : '',
		example.donts ? `Must not do:\n${example.donts}` : '',
	].filter((part) => part.length > 0);
	return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Per-example runner
// ---------------------------------------------------------------------------

interface BuildInteractivity {
	askUserCount: number;
	planToolCount: number;
	autoApprovedSuspensions: number;
	mockedCredentialTypes: string[];
}

interface FeedbackEntry {
	evaluator: string;
	metric: string;
	score: number;
	kind?: string;
	comment?: string;
}

interface ToolCallSuspension {
	message?: string;
	questions?: unknown;
	severity?: string;
	autoApproved: boolean;
}

interface ToolCallTrace {
	step: number;
	toolCallId: string;
	toolName: string;
	args?: unknown;
	result?: unknown;
	error?: string;
	elapsedMs?: number;
	suspension?: ToolCallSuspension;
}

interface ExampleRecord {
	exampleId: string;
	iteration: number;
	prompt: string;
	dos?: string;
	donts?: string;
	workflow: WorkflowResponse | null;
	build: {
		success: boolean;
		errorClass?: string;
		errorMessage?: string;
		durationMs: number;
		extraWorkflowCount: number;
		interactivity: BuildInteractivity;
	};
	toolCalls: ToolCallTrace[];
	feedback: FeedbackEntry[];
}

interface RunContext {
	client: N8nClient;
	seededCredentialTypes: string[];
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
	args: PairwiseArgs;
	logger: EvalLogger;
}

async function runExample(
	example: DatasetExample,
	iteration: number,
	context: RunContext,
): Promise<ExampleRecord> {
	const startedAt = Date.now();
	context.logger.verbose(`[${example.id} #${String(iteration)}] building workflow...`);

	let result: WorkflowTestCaseResult;
	try {
		result = await runWorkflowTestCase({
			client: context.client,
			testCase: example.testCase,
			timeoutMs: context.args.timeoutMs,
			seededCredentialTypes: context.seededCredentialTypes,
			preRunWorkflowIds: context.preRunWorkflowIds,
			claimedWorkflowIds: context.claimedWorkflowIds,
			logger: context.logger,
			keepWorkflows: context.args.keepWorkflows,
		});
	} catch (error) {
		const durationMs = Date.now() - startedAt;
		return {
			exampleId: example.id,
			iteration,
			prompt: example.prompt,
			dos: example.dos,
			donts: example.donts,
			workflow: null,
			build: {
				success: false,
				errorClass: 'framework_error',
				errorMessage: formatError(error),
				durationMs,
				extraWorkflowCount: 0,
				interactivity: emptyInteractivity(context.seededCredentialTypes),
			},
			toolCalls: [],
			feedback: buildFailureFeedback(formatError(error)),
		};
	}

	const durationMs = Date.now() - startedAt;
	const record: ExampleRecord = {
		exampleId: example.id,
		iteration,
		prompt: example.prompt,
		dos: example.dos,
		donts: example.donts,
		workflow: result.workflowJson ?? null,
		build: {
			success: result.workflowBuildSuccess,
			errorClass: result.workflowBuildSuccess ? undefined : 'build_failure',
			errorMessage: result.buildError,
			durationMs,
			extraWorkflowCount: 0,
			interactivity: interactivityFromResult(
				result.conversationMetrics,
				result.transcript,
				context.seededCredentialTypes,
			),
		},
		toolCalls: toolCallsFromTranscript(result.transcript),
		feedback: feedbackFromScenarioResults(result),
	};

	const primary = record.feedback.find((f) => f.metric === 'pairwise_primary');
	context.logger.info(
		`[${example.id} #${String(iteration)}] pairwise_primary=${String(primary?.score ?? 'n/a')} duration=${String(durationMs)}ms`,
	);
	return record;
}

function feedbackFromScenarioResults(result: WorkflowTestCaseResult): FeedbackEntry[] {
	if (!result.workflowBuildSuccess) {
		return buildFailureFeedback(result.buildError ?? 'Workflow build failed');
	}

	const scenarioResults = result.executionScenarioResults;
	const total = scenarioResults.length;
	const passed = scenarioResults.filter((scenario) => scenario.success).length;
	const primary = total > 0 && passed === total ? 1 : 0;
	const diagnostic =
		total === 0
			? primary
			: scenarioResults.reduce((sum, scenario) => sum + scenario.score, 0) / total;
	const comment = summarizeScenarioReasoning(scenarioResults);

	return [
		{
			evaluator: 'orchestrator-workflow-eval',
			metric: 'pairwise_primary',
			score: primary,
			kind: 'score',
			comment,
		},
		{
			evaluator: 'orchestrator-workflow-eval',
			metric: 'pairwise_diagnostic',
			score: diagnostic,
			kind: 'score',
			comment,
		},
		{
			evaluator: 'orchestrator-workflow-eval',
			metric: 'pairwise_judges_passed',
			score: passed,
			kind: 'score',
		},
		{
			evaluator: 'orchestrator-workflow-eval',
			metric: 'pairwise_total_passes',
			score: passed,
			kind: 'score',
		},
		{
			evaluator: 'orchestrator-workflow-eval',
			metric: 'pairwise_total_violations',
			score: Math.max(total - passed, 0),
			kind: 'score',
		},
	];
}

function buildFailureFeedback(comment: string): FeedbackEntry[] {
	return [
		{
			evaluator: 'orchestrator-workflow-eval',
			metric: 'pairwise_primary',
			score: 0,
			kind: 'score',
			comment,
		},
		{
			evaluator: 'orchestrator-workflow-eval',
			metric: 'pairwise_diagnostic',
			score: 0,
			kind: 'score',
			comment,
		},
		{
			evaluator: 'orchestrator-workflow-eval',
			metric: 'pairwise_judges_passed',
			score: 0,
			kind: 'score',
		},
	];
}

function summarizeScenarioReasoning(results: ExecutionScenarioResult[]): string {
	return results
		.map((result) => {
			const prefix = result.success ? 'PASS' : 'FAIL';
			return `${prefix} ${result.scenario.name}: ${result.reasoning}`;
		})
		.join('\n\n')
		.slice(0, 4000);
}

function emptyInteractivity(seededCredentialTypes: string[]): BuildInteractivity {
	return {
		askUserCount: 0,
		planToolCount: 0,
		autoApprovedSuspensions: 0,
		mockedCredentialTypes: [...seededCredentialTypes],
	};
}

function interactivityFromResult(
	metrics: ConversationMetrics | undefined,
	transcript: TranscriptTurn[] | undefined,
	seededCredentialTypes: string[],
): BuildInteractivity {
	const interactions = transcript?.flatMap((turn) => turn.toolInteractions) ?? [];
	const askUserCount =
		metrics?.confirmationAskedByKind.questions ??
		interactions.filter((interaction) => interaction.kind === 'ask-user').length;
	const planToolCount = interactions.filter((interaction) => interaction.kind === 'plan').length;
	const autoApprovedSuspensions = interactions.filter(
		(interaction) => interaction.kind === 'confirmation' && interaction.approved === true,
	).length;

	return {
		askUserCount,
		planToolCount,
		autoApprovedSuspensions,
		mockedCredentialTypes: [...seededCredentialTypes],
	};
}

function toolCallsFromTranscript(transcript: TranscriptTurn[] | undefined): ToolCallTrace[] {
	const traces: ToolCallTrace[] = [];
	let step = 1;
	for (const turn of transcript ?? []) {
		for (const interaction of turn.toolInteractions) {
			const trace = traceFromInteraction(step, interaction);
			if (!trace) continue;
			traces.push(trace);
			step++;
		}
	}
	return traces;
}

function traceFromInteraction(step: number, interaction: ToolInteraction): ToolCallTrace | null {
	if (interaction.kind === 'tool-call') {
		return {
			step,
			toolCallId: `transcript-${String(step)}`,
			toolName: interaction.toolName,
		};
	}
	if (interaction.kind === 'plan') {
		return {
			step,
			toolCallId: `transcript-${String(step)}`,
			toolName: 'plan',
			args: { tasks: interaction.tasks },
		};
	}
	if (interaction.kind === 'ask-user') {
		return {
			step,
			toolCallId: `transcript-${String(step)}`,
			toolName: 'ask-user',
			args: { questions: interaction.questions },
			result: interaction.answers ? { answers: interaction.answers } : undefined,
		};
	}
	if (interaction.kind === 'setup-wizard') {
		return {
			step,
			toolCallId: `transcript-${String(step)}`,
			toolName: 'workflows',
			result: {
				completedNodes: interaction.completedNodes,
				skippedNodes: interaction.skippedNodes,
				reason: interaction.reason,
			},
		};
	}
	if (interaction.kind === 'confirmation') {
		return {
			step,
			toolCallId: `transcript-${String(step)}`,
			toolName: interaction.toolName,
			suspension: {
				message: interaction.resumeReason,
				autoApproved: interaction.approved === true,
			},
			result: { approved: interaction.approved },
		};
	}
	return null;
}

// ---------------------------------------------------------------------------
// Output writing
// ---------------------------------------------------------------------------

interface Summary {
	builder: 'instance-ai';
	dataset: string;
	judgeModel: string;
	numJudges: number;
	iterations: number;
	experimentName: string;
	startedAt: string;
	finishedAt: string;
	totals: {
		examples: number;
		runs: number;
		buildSuccess: number;
		buildFailures: Record<string, number>;
		primaryPassRate: number;
		avgDiagnostic: number;
		submitCallsTotal: number;
		avgSubmitCalls: number;
		toolCallErrorRate: number;
		toolCallsTotal: number;
		toolCallErrors: number;
	};
	interactivity: BuildInteractivity;
	sandbox: { provider: string };
}

async function writeOutputs(
	outputDir: string,
	records: ExampleRecord[],
	args: PairwiseArgs,
	startedAt: Date,
	finishedAt: Date,
	logger: EvalLogger,
	silent = false,
): Promise<Summary> {
	await fs.mkdir(outputDir, { recursive: true });
	await fs.mkdir(path.join(outputDir, 'workflows'), { recursive: true });

	const sorted = [...records].sort(compareRecords);
	const jsonlPath = path.join(outputDir, 'results.jsonl');
	await fs.writeFile(
		jsonlPath,
		sorted.map((record) => JSON.stringify(record)).join('\n') + '\n',
		'utf8',
	);

	for (const record of sorted) {
		if (!record.workflow) continue;
		const slug = safeFilename(`${record.exampleId}_${String(record.iteration)}`);
		const workflowPath = path.join(outputDir, 'workflows', `${slug}.json`);
		if (!(await fileExists(workflowPath))) {
			await fs.writeFile(workflowPath, JSON.stringify(record.workflow, null, 2), 'utf8');
		}
	}

	await writeCsv(path.join(outputDir, 'results.csv'), sorted);

	const summary = summarizeRecords(sorted, args, startedAt, finishedAt);
	await fs.writeFile(
		path.join(outputDir, 'summary.json'),
		JSON.stringify(summary, null, 2),
		'utf8',
	);
	if (!silent) {
		logger.success(`Wrote ${String(records.length)} result(s) to ${outputDir}`);
	}
	return summary;
}

async function writeCsv(csvPath: string, records: ExampleRecord[]): Promise<void> {
	const csvHeader = [
		'exampleId',
		'iteration',
		'buildSuccess',
		'buildError',
		'durationMs',
		'askUserCount',
		'planToolCount',
		'submitCalls',
		'toolCalls',
		'toolCallErrors',
		'pairwisePrimary',
		'pairwiseDiagnostic',
		'pairwiseJudgesPassed',
	].join(',');
	const csvRows = records.map((record) => {
		const find = (metric: string) =>
			record.feedback.find((feedback) => feedback.metric === metric)?.score ?? '';
		const saveCalls = record.toolCalls.filter(isWorkflowSaveTool).length;
		const errors = record.toolCalls.filter(isErroredToolCall).length;
		return [
			record.exampleId,
			record.iteration,
			record.build.success ? 1 : 0,
			record.build.errorClass ?? '',
			record.build.durationMs,
			record.build.interactivity.askUserCount,
			record.build.interactivity.planToolCount,
			saveCalls,
			record.toolCalls.length,
			errors,
			find('pairwise_primary'),
			find('pairwise_diagnostic'),
			find('pairwise_judges_passed'),
		]
			.map(csvCell)
			.join(',');
	});
	await fs.writeFile(csvPath, [csvHeader, ...csvRows].join('\n') + '\n', 'utf8');
}

function summarizeRecords(
	records: ExampleRecord[],
	args: PairwiseArgs,
	startedAt: Date,
	finishedAt: Date,
): Summary {
	const buildFailures: Record<string, number> = {};
	let buildSuccess = 0;
	let primaryPassSum = 0;
	let primaryPassCount = 0;
	let diagnosticSum = 0;
	let diagnosticCount = 0;
	const allMockedCreds = new Set<string>();
	let askUserCount = 0;
	let planToolCount = 0;
	let autoApprovedSuspensions = 0;
	let submitCallsTotal = 0;
	let toolCallsTotal = 0;
	let toolCallErrors = 0;

	for (const record of records) {
		if (record.build.success) buildSuccess++;
		if (record.build.errorClass) {
			buildFailures[record.build.errorClass] = (buildFailures[record.build.errorClass] ?? 0) + 1;
		}
		askUserCount += record.build.interactivity.askUserCount;
		planToolCount += record.build.interactivity.planToolCount;
		autoApprovedSuspensions += record.build.interactivity.autoApprovedSuspensions;
		for (const type of record.build.interactivity.mockedCredentialTypes) {
			allMockedCreds.add(type);
		}

		for (const toolCall of record.toolCalls) {
			toolCallsTotal++;
			if (isErroredToolCall(toolCall)) toolCallErrors++;
			if (isWorkflowSaveTool(toolCall)) submitCallsTotal++;
		}

		const primary = record.feedback.find(
			(feedback) => feedback.metric === 'pairwise_primary',
		)?.score;
		if (typeof primary === 'number') {
			primaryPassSum += primary;
			primaryPassCount++;
		} else if (!record.build.success) {
			primaryPassCount++;
		}
		const diagnostic = record.feedback.find(
			(feedback) => feedback.metric === 'pairwise_diagnostic',
		)?.score;
		if (typeof diagnostic === 'number') {
			diagnosticSum += diagnostic;
			diagnosticCount++;
		}
	}

	return {
		builder: 'instance-ai',
		dataset: args.useLocalWorkflows ? `local-workflows:${args.filter ?? 'all'}` : args.dataset,
		judgeModel: args.judgeModel,
		numJudges: args.judges,
		iterations: args.iterations,
		experimentName: args.experimentName,
		startedAt: startedAt.toISOString(),
		finishedAt: finishedAt.toISOString(),
		totals: {
			examples: new Set(records.map((record) => record.exampleId)).size,
			runs: records.length,
			buildSuccess,
			buildFailures,
			primaryPassRate: primaryPassCount ? primaryPassSum / primaryPassCount : 0,
			avgDiagnostic: diagnosticCount ? diagnosticSum / diagnosticCount : 0,
			submitCallsTotal,
			avgSubmitCalls: records.length ? submitCallsTotal / records.length : 0,
			toolCallsTotal,
			toolCallErrors,
			toolCallErrorRate: toolCallsTotal ? toolCallErrors / toolCallsTotal : 0,
		},
		interactivity: {
			askUserCount,
			planToolCount,
			autoApprovedSuspensions,
			mockedCredentialTypes: Array.from(allMockedCreds),
		},
		sandbox: { provider: 'orchestrator' },
	};
}

async function regenerateReport(
	reportRoot: string,
	reportFile: string,
	logger: EvalLogger,
): Promise<void> {
	try {
		const runs = await loadRuns(reportRoot);
		if (runs.length === 0) return;
		const html = renderDocument(runs);
		await fs.writeFile(reportFile, html, 'utf8');
		logger.verbose(`Regenerated report (${String(runs.length)} run(s)) at ${reportFile}`);
	} catch (error) {
		logger.warn(`Report regeneration failed: ${formatError(error)}`);
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const logger = createLogger(args.verbose);
	logger.info(
		`pairwise eval: dataset=${args.dataset} iterations=${String(args.iterations)} target=${args.baseUrl}`,
	);

	const examples = await loadExamples(args, logger);
	const filtered = filterExamples(examples, args, logger);
	const selected = args.maxExamples !== undefined ? filtered.slice(0, args.maxExamples) : filtered;
	if (selected.length === 0) {
		throw new Error('No examples selected.');
	}
	logger.info(
		`Running ${String(selected.length)} example(s) x ${String(args.iterations)} iteration(s)`,
	);

	const client = new N8nClient(args.baseUrl);
	logger.info(`Authenticating with ${args.baseUrl}...`);
	await client.login(args.email, args.password);
	logger.success('Authenticated');

	logger.info('Seeding credentials...');
	const seedResult = await seedCredentials(client, undefined, logger);
	logger.info(`Seeded ${String(seedResult.credentialIds.length)} credential(s)`);

	const preRunWorkflowIds = await snapshotWorkflowIds(client);
	const claimedWorkflowIds = new Set<string>();
	const records: ExampleRecord[] = [];
	const startedAt = new Date();
	const reportRoot = path.dirname(args.outputDir);
	const reportFile = path.join(reportRoot, 'report.html');
	const context: RunContext = {
		client,
		seededCredentialTypes: seedResult.seededTypes,
		preRunWorkflowIds,
		claimedWorkflowIds,
		args,
		logger,
	};
	const limit = pLimit(Math.min(args.concurrency, MAX_CONCURRENT_BUILDS));
	let writeQueue: Promise<unknown> = Promise.resolve();

	const flushIncremental = async (): Promise<void> => {
		writeQueue = writeQueue.then(async () => {
			await writeOutputs(args.outputDir, records, args, startedAt, new Date(), logger, true);
			await regenerateReport(reportRoot, reportFile, logger);
		});
		await writeQueue;
	};

	try {
		const work: Array<Promise<void>> = [];
		for (const example of selected) {
			for (let iteration = 1; iteration <= args.iterations; iteration++) {
				work.push(
					limit(async () => {
						const record = await runExample(example, iteration, context);
						records.push(record);
						await flushIncremental();
					}),
				);
			}
		}
		await Promise.all(work);
		await writeQueue;

		const finishedAt = new Date();
		await writeOutputs(args.outputDir, records, args, startedAt, finishedAt, logger);
		await regenerateReport(reportRoot, reportFile, logger);
		logger.info(`Report: ${reportFile}`);
		logger.info(
			`Pairwise-compatible outputs are in ${args.outputDir}; builds used the main Instance AI orchestrator.`,
		);
	} finally {
		await cleanupCredentials(client, seedResult.credentialIds).catch(() => {});
	}
}

function filterExamples(
	examples: DatasetExample[],
	args: PairwiseArgs,
	logger: EvalLogger,
): DatasetExample[] {
	if (!args.exampleIds) return examples;
	const ids = args.exampleIds;
	const filtered = examples.filter((example) => ids.has(example.id));
	const missing = Array.from(ids).filter((id) => !examples.some((example) => example.id === id));
	logger.info(
		`Filtered to ${String(filtered.length)} example(s) by --example-ids-file (${String(ids.size)} requested${missing.length ? `, ${String(missing.length)} not found` : ''})`,
	);
	if (missing.length > 0) {
		logger.warn(
			`Missing IDs: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', ...' : ''}`,
		);
	}
	return filtered;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeFilename(s: string): string {
	return s.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

function compareRecords(a: ExampleRecord, b: ExampleRecord): number {
	if (a.exampleId === b.exampleId) return a.iteration - b.iteration;
	return a.exampleId.localeCompare(b.exampleId);
}

function isWorkflowSaveTool(trace: Pick<ToolCallTrace, 'toolName' | 'args'>): boolean {
	const args = isRecord(trace.args) ? trace.args : {};
	return (
		trace.toolName === 'build-workflow' ||
		(trace.toolName === 'workflows' && (args.action === 'create' || args.action === 'update'))
	);
}

function isErroredToolCall(trace: ToolCallTrace): boolean {
	if (trace.error !== undefined) return true;
	const result = trace.result;
	if (result === null || result === undefined) return false;

	if (typeof result === 'object' && !Array.isArray(result)) {
		const obj = result;
		if ('success' in obj && obj.success === false) return true;
		if ('error' in obj && typeof obj.error === 'string' && obj.error.length > 0) return true;
		if ('errors' in obj && Array.isArray(obj.errors) && obj.errors.length > 0) return true;
	}

	if (typeof result === 'string' && /\bExit code:\s*[1-9]\d*\b/.test(result)) {
		return true;
	}

	return false;
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

function csvCell(value: unknown): string {
	if (value === null || value === undefined) return '';
	const str = stringifyForOutput(value);
	if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		return '"' + str.replace(/"/g, '""') + '"';
	}
	return str;
}

function formatError(error: unknown): string {
	if (error instanceof Error) return error.message;
	return stringifyForOutput(error);
}

function stringifyForOutput(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return value.toString();
	}
	if (typeof value === 'symbol') return value.description ?? '[symbol]';
	if (typeof value === 'function') return '[function]';
	try {
		return JSON.stringify(value) ?? '[object]';
	} catch {
		return '[unserializable object]';
	}
}

if (require.main === module) {
	main().catch((error) => {
		console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
		process.exit(1);
	});
}
