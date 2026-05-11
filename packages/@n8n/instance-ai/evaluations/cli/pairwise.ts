// ---------------------------------------------------------------------------
// Pairwise eval CLI for instance-ai.
//
// Pulls the pairwise dataset (default: notion-pairwise-workflows) from
// LangSmith or a local file, builds one workflow per example via the
// in-process instance-ai agent, and scores the result with the same
// pairwise judge panel used by ai-workflow-builder.ee.
//
// Results are written to an output directory so a later step can build
// a head-to-head comparison report against the ai-workflow-builder.ee
// baseline.
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-base-to-string */
// `SimpleWorkflow` is imported from `ai-workflow-builder.ee` via deep relative
// paths; the `@/*` alias used inside that package collides with instance-ai's
// own `@/*` mapping during transitive type-checking, so the type resolves to
// `error` here. The `csvCell()` helper also calls `String(value)` on `unknown`
// values by design.

import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Client as LangSmithClient } from 'langsmith';
import { nanoid } from 'nanoid';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import pLimit from 'p-limit';

import { loadRuns, renderDocument } from './report';
import {
	createPairwiseEvaluator,
	type Feedback,
	type SimpleWorkflow,
} from '../../../ai-workflow-builder.ee/evaluations/evaluators/pairwise';
import { DEFAULTS } from '../../../ai-workflow-builder.ee/evaluations/support/constants';
import { buildSubAgentBriefing } from '../../src/agent/sub-agent-briefing';
import type { Logger } from '../../src/logger';
import { DETACHED_BUILDER_REQUIREMENTS } from '../../src/tools/orchestration/build-workflow-agent.tool';
import { BuilderSandboxFactory } from '../../src/workspace/builder-sandbox-factory';
import type { SandboxConfig } from '../../src/workspace/create-workspace';
import { SnapshotManager } from '../../src/workspace/snapshot-manager';
import {
	buildInProcess,
	type InProcessBuildResult,
	type ToolCallTrace,
} from '../harness/in-process-builder';
import { createLogger, type EvalLogger } from '../harness/logger';
import { resolveSandboxConfig } from '../harness/sandbox-config';

/** Default dataset — orchestrator-plan-derived spec rows. Each row's prompt
 * is the spec the production planner hands the builder via
 * `dispatchPlannedTask`. Pair this with the production briefing wrapper
 * (`DETACHED_BUILDER_REQUIREMENTS`) below to keep the eval aligned with
 * what the builder sees in production. */
const DEFAULT_DATASET = 'instance-ai-builder-from-plans';

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
	verbose: boolean;
}

function parseArgs(argv: string[]): PairwiseArgs {
	const get = (flag: string): string | undefined => {
		const idx = argv.indexOf(flag);
		if (idx === -1) return undefined;
		const value = argv[idx + 1];
		return value && !value.startsWith('--') ? value : undefined;
	};
	const has = (flag: string): boolean => argv.includes(flag);

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

	return {
		dataset: get('--dataset') ?? DEFAULT_DATASET,
		judges: parsePositiveInt(get('--judges'), '--judges') ?? Number(DEFAULTS.NUM_JUDGES),
		iterations:
			parsePositiveInt(get('--iterations'), '--iterations') ?? Number(DEFAULTS.REPETITIONS),
		concurrency:
			parsePositiveInt(get('--concurrency'), '--concurrency') ?? Number(DEFAULTS.CONCURRENCY),
		maxExamples: parsePositiveInt(get('--max-examples'), '--max-examples'),
		exampleIds,
		examplesJsonl: get('--examples-jsonl'),
		timeoutMs:
			parsePositiveNumber(get('--timeout-ms'), '--timeout-ms') ?? Number(DEFAULTS.TIMEOUT_MS),
		outputDir: get('--output-dir') ?? defaultOutputDir,
		judgeModel: get('--judge-model') ?? 'claude-sonnet-4-5-20250929',
		experimentName: get('--experiment-name') ?? 'pairwise-evals-instance-ai',
		verbose: has('--verbose'),
	};
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
// Sandbox factory wiring
// ---------------------------------------------------------------------------

function createSandboxFactory(
	config: SandboxConfig,
	evalLogger: EvalLogger,
): BuilderSandboxFactory {
	if (!config.enabled) {
		throw new Error(
			'Sandbox config is unexpectedly disabled — eval runs always require a sandbox.',
		);
	}

	const factoryLogger: Logger = {
		debug: (message, meta) => evalLogger.verbose(`[sandbox] ${message}${formatMeta(meta)}`),
		info: (message, meta) => evalLogger.verbose(`[sandbox] ${message}${formatMeta(meta)}`),
		warn: (message, meta) => evalLogger.warn(`[sandbox] ${message}${formatMeta(meta)}`),
		error: (message, meta) => evalLogger.error(`[sandbox] ${message}${formatMeta(meta)}`),
	};

	const imageManager =
		config.provider === 'daytona'
			? new SnapshotManager(config.image, factoryLogger, undefined)
			: undefined;
	return new BuilderSandboxFactory(config, imageManager, factoryLogger);
}

function formatMeta(meta: unknown): string {
	if (!meta || typeof meta !== 'object') return '';
	try {
		return ` ${JSON.stringify(meta)}`;
	} catch {
		return '';
	}
}

// ---------------------------------------------------------------------------
// Dataset loading
// ---------------------------------------------------------------------------

interface DatasetExample {
	id: string;
	prompt: string;
	dos?: string;
	donts?: string;
}

async function loadExamples(args: PairwiseArgs, logger: EvalLogger): Promise<DatasetExample[]> {
	if (args.examplesJsonl) {
		return loadExamplesFromJsonl(args.examplesJsonl, logger);
	}
	logger.info(`Fetching dataset "${args.dataset}" from LangSmith`);
	const lsClient = new LangSmithClient();
	const examples: DatasetExample[] = [];
	const layoutCounts = { evals: 0, context: 0, none: 0 };
	for await (const raw of lsClient.listExamples({ datasetName: args.dataset })) {
		const inputs = isRecord(raw.inputs) ? raw.inputs : {};
		// The notion-pairwise-workflows dataset stores criteria under
		// `inputs.evals.{dos,donts}`. Older fixtures used `inputs.context.*`
		// — read both paths so both layouts work.
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
		const example: DatasetExample = {
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
		`Dataset criteria layout: evals=${layoutCounts.evals} context=${layoutCounts.context} none=${layoutCounts.none}`,
	);
	return examples;
}

/**
 * Load examples from a JSONL file. Accepts the shape produced by a previous
 * pairwise run (`results.jsonl`) where each row carries `exampleId`, `prompt`,
 * `dos`, `donts`. Useful for re-running a frozen example set after the source
 * LangSmith dataset has changed.
 */
function loadExamplesFromJsonl(filePath: string, logger: EvalLogger): DatasetExample[] {
	const absolute = path.resolve(filePath);
	logger.info(`Loading examples from local JSONL: ${absolute}`);
	const content = readFileSync(absolute, 'utf8');
	const examples: DatasetExample[] = [];
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
			logger.warn(`Skipping JSONL row ${row}: invalid JSON (${(error as Error).message})`);
			continue;
		}
		if (!isRecord(parsed)) continue;
		const id = typeof parsed.exampleId === 'string' ? parsed.exampleId : '';
		const prompt = typeof parsed.prompt === 'string' ? parsed.prompt : '';
		if (!id || !prompt) {
			logger.warn(`Skipping JSONL row ${row}: missing exampleId or prompt`);
			continue;
		}
		// Each iteration of the same example yields a row in results.jsonl;
		// dedupe by id so we only run the example once per requested iteration.
		if (seen.has(id)) continue;
		seen.add(id);
		examples.push({
			id,
			prompt,
			dos: typeof parsed.dos === 'string' ? parsed.dos : undefined,
			donts: typeof parsed.donts === 'string' ? parsed.donts : undefined,
		});
	}
	logger.info(`Loaded ${examples.length} unique examples from ${absolute}`);
	return examples;
}

// ---------------------------------------------------------------------------
// Per-example runner
// ---------------------------------------------------------------------------

interface ExampleRecord {
	exampleId: string;
	iteration: number;
	prompt: string;
	dos?: string;
	donts?: string;
	workflow: SimpleWorkflow | null;
	build: {
		success: boolean;
		errorClass?: string;
		errorMessage?: string;
		durationMs: number;
		extraWorkflowCount: number;
		interactivity: InProcessBuildResult['interactivity'];
	};
	toolCalls: ToolCallTrace[];
	feedback: Feedback[];
}

async function runExample(
	example: DatasetExample,
	iteration: number,
	judgeLlm: BaseChatModel,
	args: PairwiseArgs,
	logger: EvalLogger,
	sandboxFactory: BuilderSandboxFactory,
): Promise<ExampleRecord> {
	logger.verbose(`[${example.id} #${iteration}] building workflow...`);
	const logPath = path.join(
		args.outputDir,
		'chunks',
		`${safeFilename(`${example.id}_${iteration}`)}.jsonl`,
	);
	// Wrap the prompt the same way the production orchestrator wraps the spec
	// it hands to the builder sub-agent (see `build-workflow-agent.tool.ts`).
	// Keeping this aligned with prod is what closes the eval/prod gap —
	// `DETACHED_BUILDER_REQUIREMENTS` is what tells the builder it must
	// `submit-workflow` then `verify-built-workflow` before stopping.
	//
	// `workItemId` round-trips: the briefing's `additionalContext` tells the
	// agent its work-item ID, the agent passes it to `verify-built-workflow`,
	// which reads back the build outcome from the in-memory
	// `workflowTaskService` keyed on the same ID.
	const workItemId = 'wi_' + nanoid(8);
	const builderPrompt = await buildSubAgentBriefing({
		task: example.prompt,
		additionalContext: `[WORK ITEM ID: ${workItemId}]`,
		requirements: DETACHED_BUILDER_REQUIREMENTS,
	});
	const build = await buildInProcess({
		prompt: builderPrompt,
		workItemId,
		timeoutMs: args.timeoutMs,
		logPath,
		sandboxFactory,
	});

	const record: ExampleRecord = {
		exampleId: example.id,
		iteration,
		prompt: example.prompt,
		dos: example.dos,
		donts: example.donts,
		workflow: build.workflow ?? null,
		build: {
			success: build.success,
			errorClass: build.errorClass,
			errorMessage: build.errorMessage,
			durationMs: build.durationMs,
			extraWorkflowCount: build.extraWorkflows.length,
			interactivity: build.interactivity,
		},
		toolCalls: build.toolCalls,
		feedback: [],
	};

	if (!build.workflow) {
		logger.warn(
			`[${example.id} #${iteration}] build failed (${build.errorClass ?? 'unknown'}): ${build.errorMessage ?? 'no details'}`,
		);
		return record;
	}

	try {
		const evaluator = createPairwiseEvaluator(judgeLlm, { numJudges: args.judges });
		const feedback = await evaluator.evaluate(build.workflow, {
			prompt: example.prompt,
			dos: example.dos,
			donts: example.donts,
		});
		record.feedback = feedback;
		const primary = feedback.find((f) => f.metric === 'pairwise_primary');
		logger.info(
			`[${example.id} #${iteration}] pairwise_primary=${primary?.score ?? 'n/a'} duration=${build.durationMs}ms`,
		);
	} catch (error) {
		logger.error(
			`[${example.id} #${iteration}] judge panel failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	return record;
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
		/** Total `submit-workflow` tool invocations across all records. */
		submitCallsTotal: number;
		/** Mean `submit-workflow` invocations per build. 1.0 = every build called
		 *  submit exactly once; >1.0 = builds had to fix and re-submit. */
		avgSubmitCalls: number;
		/** (errored tool calls) / (total tool calls) micro-averaged across all
		 *  runs. Captures how rough the build path was even on builds that
		 *  eventually succeeded — every TypeScript compile error or failed
		 *  domain tool call shows up here. */
		toolCallErrorRate: number;
		/** Total tool calls observed (used as the error-rate denominator and
		 *  surfaced for context). */
		toolCallsTotal: number;
		/** Total errored tool calls observed (numerator of `toolCallErrorRate`). */
		toolCallErrors: number;
	};
	interactivity: {
		askUserCount: number;
		planToolCount: number;
		autoApprovedSuspensions: number;
		mockedCredentialTypes: string[];
	};
	sandbox: { provider: string };
}

async function writeOutputs(
	outputDir: string,
	records: ExampleRecord[],
	args: PairwiseArgs,
	startedAt: Date,
	finishedAt: Date,
	logger: EvalLogger,
	sandboxProvider: string,
	silent = false,
): Promise<Summary> {
	await fs.mkdir(outputDir, { recursive: true });
	await fs.mkdir(path.join(outputDir, 'workflows'), { recursive: true });

	// results.jsonl + per-workflow files. Workflow JSON is immutable per
	// (exampleId, iteration), so skip any file already on disk to avoid
	// O(N²) rewrites across incremental flushes.
	const jsonlPath = path.join(outputDir, 'results.jsonl');
	const lines: string[] = [];
	for (const record of records) {
		lines.push(JSON.stringify(record));
		if (record.workflow) {
			const slug = safeFilename(`${record.exampleId}_${record.iteration}`);
			const workflowPath = path.join(outputDir, 'workflows', `${slug}.json`);
			if (!(await fileExists(workflowPath))) {
				await fs.writeFile(workflowPath, JSON.stringify(record.workflow, null, 2), 'utf8');
			}
		}
	}
	await fs.writeFile(jsonlPath, lines.join('\n') + '\n', 'utf8');

	// results.csv — flat metric columns for spreadsheet import
	const csvPath = path.join(outputDir, 'results.csv');
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
	const csvRows = records.map((r) => {
		const find = (m: string) => r.feedback.find((f) => f.metric === m)?.score ?? '';
		const submits = r.toolCalls.filter((tc) => tc.toolName === 'submit-workflow').length;
		const errors = r.toolCalls.filter(isErroredToolCall).length;
		return [
			r.exampleId,
			r.iteration,
			r.build.success ? 1 : 0,
			r.build.errorClass ?? '',
			r.build.durationMs,
			r.build.interactivity.askUserCount,
			r.build.interactivity.planToolCount,
			submits,
			r.toolCalls.length,
			errors,
			find('pairwise_primary'),
			find('pairwise_diagnostic'),
			find('pairwise_judges_passed'),
		]
			.map(csvCell)
			.join(',');
	});
	await fs.writeFile(csvPath, [csvHeader, ...csvRows].join('\n') + '\n', 'utf8');

	// summary.json
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

		// `toolCalls` is the ordered timeline captured by the trace collector.
		// We count any tool call that errored OR returned a failed result —
		// hard Mastra tool failures are rare, but `submit-workflow` rejections
		// and `execute_command` returning a non-zero `tsc` exit are common and
		// dominate the "rough path" signal we care about. Suspensions are
		// benign (auto-approved or surfaced via `errorClass` separately).
		for (const tc of record.toolCalls) {
			toolCallsTotal++;
			if (isErroredToolCall(tc)) toolCallErrors++;
			if (tc.toolName === 'submit-workflow') submitCallsTotal++;
		}

		const primary = record.feedback.find((f) => f.metric === 'pairwise_primary')?.score;
		if (typeof primary === 'number') {
			primaryPassSum += primary;
			primaryPassCount++;
		} else if (!record.build.success) {
			// A build failure means the agent had its chance and produced no
			// workflow — that's a failed attempt at the pairwise criteria, not
			// a measurement gap. Count it as 0 so the pass rate isn't inflated
			// by silently dropping failures from the denominator. Judge errors
			// (build succeeded but the panel threw) are still excluded — those
			// are tooling problems, not builder problems.
			primaryPassCount++;
		}
		const diag = record.feedback.find((f) => f.metric === 'pairwise_diagnostic')?.score;
		if (typeof diag === 'number') {
			diagnosticSum += diag;
			diagnosticCount++;
		}
	}

	const summary: Summary = {
		builder: 'instance-ai',
		dataset: args.dataset,
		judgeModel: args.judgeModel,
		numJudges: args.judges,
		iterations: args.iterations,
		experimentName: args.experimentName,
		startedAt: startedAt.toISOString(),
		finishedAt: finishedAt.toISOString(),
		totals: {
			examples: new Set(records.map((r) => r.exampleId)).size,
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
		sandbox: { provider: sandboxProvider },
	};
	await fs.writeFile(
		path.join(outputDir, 'summary.json'),
		JSON.stringify(summary, null, 2),
		'utf8',
	);
	if (!silent) {
		logger.success(`Wrote ${records.length} results to ${outputDir}`);
	}
	return summary;
}

/**
 * Regenerate the cross-run HTML report from `<reportRoot>/*` so the page
 * stays current as examples complete. Best-effort: a render failure is
 * logged but does not abort the run.
 */
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
		logger.verbose(`Regenerated report (${runs.length} run(s)) at ${reportFile}`);
	} catch (error) {
		logger.warn(
			`Report regeneration failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const logger = createLogger(args.verbose);
	logger.info(
		`pairwise eval: dataset=${args.dataset} judges=${args.judges} iterations=${args.iterations}`,
	);

	const apiKey = process.env.N8N_AI_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error(
			'Set N8N_AI_ANTHROPIC_KEY or ANTHROPIC_API_KEY — both the builder agent and the judge LLM need it.',
		);
	}

	const sandboxConfig = resolveSandboxConfig(process.env);
	const sandboxFactory = createSandboxFactory(sandboxConfig, logger);
	if (!sandboxConfig.enabled) {
		throw new Error('resolveSandboxConfig returned a disabled config — this should never happen.');
	}
	logger.info(
		`Sandbox: provider=${sandboxConfig.provider} (workflow built via TypeScript file + tsc)`,
	);

	const judgeLlm = new ChatAnthropic({
		model: args.judgeModel,
		apiKey,
		temperature: 0,
		maxTokens: 8192,
	});

	const examples = await loadExamples(args, logger);
	let filtered = examples;
	if (args.exampleIds) {
		const ids = args.exampleIds;
		filtered = examples.filter((e) => ids.has(e.id));
		const missing = Array.from(ids).filter((id) => !examples.some((e) => e.id === id));
		logger.info(
			`Filtered to ${filtered.length} examples by --example-ids-file (${ids.size} requested${missing.length ? `, ${missing.length} not found` : ''})`,
		);
		if (missing.length) {
			logger.warn(
				`Missing IDs: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', ...' : ''}`,
			);
		}
	}
	const selected = args.maxExamples !== undefined ? filtered.slice(0, args.maxExamples) : filtered;
	logger.info(`Running ${selected.length} examples x ${args.iterations} iterations`);

	const limit = pLimit(args.concurrency);
	const records: ExampleRecord[] = [];
	const startedAt = new Date();
	const reportRoot = path.dirname(args.outputDir);
	const reportFile = path.join(reportRoot, 'report.html');

	// Serialize incremental writes so concurrent example completions don't
	// race on the same output files.
	let writeQueue: Promise<unknown> = Promise.resolve();
	const flushIncremental = async (): Promise<unknown> => {
		writeQueue = writeQueue.then(async () => {
			const snapshot = [...records].sort((a, b) =>
				a.exampleId === b.exampleId
					? a.iteration - b.iteration
					: a.exampleId.localeCompare(b.exampleId),
			);
			await writeOutputs(
				args.outputDir,
				snapshot,
				args,
				startedAt,
				new Date(),
				logger,
				sandboxConfig.provider,
				true,
			);
			await regenerateReport(reportRoot, reportFile, logger);
		});
		return await writeQueue;
	};

	const work: Array<Promise<void>> = [];
	for (const example of selected) {
		for (let i = 1; i <= args.iterations; i++) {
			work.push(
				limit(async () => {
					const record = await runExample(example, i, judgeLlm, args, logger, sandboxFactory);
					records.push(record);
					await flushIncremental();
				}),
			);
		}
	}
	await Promise.all(work);
	await writeQueue;

	const finishedAt = new Date();
	records.sort((a, b) =>
		a.exampleId === b.exampleId
			? a.iteration - b.iteration
			: a.exampleId.localeCompare(b.exampleId),
	);
	await writeOutputs(
		args.outputDir,
		records,
		args,
		startedAt,
		finishedAt,
		logger,
		sandboxConfig.provider,
	);
	await regenerateReport(reportRoot, reportFile, logger);
	logger.info(`Report: ${reportFile}`);
	logger.info(
		`Note: LangSmith feedback upload is not yet wired up — scores are in ${args.outputDir}. ` +
			'Run scripts/upload-pairwise-to-langsmith.ts against summary.json to push results.',
	);
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

/**
 * Whether a tool call should count toward the "tool error rate" metric.
 *
 * Catches three flavours:
 * 1. **Hard Mastra failure** (`trace.error` set) — tool threw / rejected.
 * 2. **Tool returned a failed result object** — e.g. `submit-workflow`
 *    returning `{ success: false, errors: [...] }`. Looks at top-level
 *    `success === false` or non-empty `errors` array, plus a string
 *    `error` field.
 * 3. **`execute_command` returned a non-zero exit code** — e.g. `tsc`
 *    spitting out compile errors. Looks for an `Exit code: <non-zero>`
 *    marker in the result text.
 */
function isErroredToolCall(trace: ToolCallTrace): boolean {
	if (trace.error !== undefined) return true;
	const r = trace.result;
	if (r === null || r === undefined) return false;

	if (typeof r === 'object' && !Array.isArray(r)) {
		const obj = r as Record<string, unknown>;
		if (obj.success === false) return true;
		if (typeof obj.error === 'string' && obj.error.length > 0) return true;
		if (Array.isArray(obj.errors) && obj.errors.length > 0) return true;
	}

	if (typeof r === 'string' && /\bExit code:\s*[1-9]\d*\b/.test(r)) {
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
	const str = String(value);
	if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		return '"' + str.replace(/"/g, '""') + '"';
	}
	return str;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
	main().catch((error) => {
		console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
		process.exit(1);
	});
}
