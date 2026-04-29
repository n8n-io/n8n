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

import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatAnthropic } from '@langchain/anthropic';
import pLimit from 'p-limit';
import { Client as LangSmithClient } from 'langsmith';

import {
	createPairwiseEvaluator,
	type Feedback,
	type SimpleWorkflow,
} from '../../../ai-workflow-builder.ee/evaluations/evaluators/pairwise';
import { DEFAULTS } from '../../../ai-workflow-builder.ee/evaluations/support/constants';

import { buildInProcess, type InProcessBuildResult } from '../harness/in-process-builder';
import { createLogger, type EvalLogger } from '../harness/logger';
import { resolveSandboxConfig } from '../harness/sandbox-config';
import type { Logger } from '../../src/logger';
import { BuilderSandboxFactory } from '../../src/workspace/builder-sandbox-factory';
import type { SandboxConfig } from '../../src/workspace/create-workspace';
import { SnapshotManager } from '../../src/workspace/snapshot-manager';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface PairwiseArgs {
	backend: 'local' | 'langsmith';
	dataset: string;
	judges: number;
	iterations: number;
	concurrency: number;
	maxExamples?: number;
	exampleIds?: Set<string>;
	timeoutMs: number;
	outputDir: string;
	judgeModel: string;
	experimentName: string;
	verbose: boolean;
	sandbox: boolean;
	includeTemplates: boolean;
}

function parseArgs(argv: string[]): PairwiseArgs {
	const get = (flag: string): string | undefined => {
		const idx = argv.indexOf(flag);
		if (idx === -1) return undefined;
		const value = argv[idx + 1];
		return value && !value.startsWith('--') ? value : undefined;
	};
	const has = (flag: string): boolean => argv.includes(flag);

	const backendRaw = get('--backend') ?? 'local';
	if (backendRaw !== 'local' && backendRaw !== 'langsmith') {
		throw new Error(`--backend must be "local" or "langsmith", got "${backendRaw}"`);
	}

	const iso = new Date().toISOString().replace(/[:.]/g, '-');
	const defaultOutputDir = path.resolve(process.cwd(), '.output', 'pairwise', iso);

	const exampleIdsFile = get('--example-ids-file');
	let exampleIds: Set<string> | undefined;
	if (exampleIdsFile) {
		const content = require('node:fs').readFileSync(exampleIdsFile, 'utf8') as string;
		const ids = content
			.split('\n')
			.map((s) => s.trim())
			.filter((s) => s.length > 0 && !s.startsWith('#'));
		exampleIds = new Set(ids);
	}

	return {
		backend: backendRaw,
		dataset: get('--dataset') ?? DEFAULTS.DATASET_NAME,
		judges: Number(get('--judges') ?? DEFAULTS.NUM_JUDGES),
		iterations: Number(get('--iterations') ?? DEFAULTS.REPETITIONS),
		concurrency: Number(get('--concurrency') ?? DEFAULTS.CONCURRENCY),
		maxExamples: get('--max-examples') ? Number(get('--max-examples')) : undefined,
		exampleIds,
		timeoutMs: Number(get('--timeout-ms') ?? DEFAULTS.TIMEOUT_MS),
		outputDir: get('--output-dir') ?? defaultOutputDir,
		judgeModel: get('--judge-model') ?? 'claude-sonnet-4-5-20250929',
		experimentName: get('--experiment-name') ?? 'pairwise-evals-instance-ai',
		verbose: has('--verbose'),
		sandbox: !has('--no-sandbox'),
		includeTemplates: !has('--no-templates'),
	};
}

// ---------------------------------------------------------------------------
// Sandbox factory wiring
// ---------------------------------------------------------------------------

function createSandboxFactory(
	config: SandboxConfig,
	evalLogger: EvalLogger,
): BuilderSandboxFactory | undefined {
	if (!config.enabled) return undefined;

	const factoryLogger: Logger = {
		debug: (message, meta) => evalLogger.verbose(`[sandbox] ${message}${formatMeta(meta)}`),
		info: (message, meta) => evalLogger.verbose(`[sandbox] ${message}${formatMeta(meta)}`),
		warn: (message, meta) => evalLogger.warn(`[sandbox] ${message}${formatMeta(meta)}`),
		error: (message, meta) => evalLogger.error(`[sandbox] ${message}${formatMeta(meta)}`),
	};

	const imageManager =
		config.provider === 'daytona' ? new SnapshotManager(config.image, factoryLogger) : undefined;
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
	if (args.backend === 'local') {
		logger.info(`Loading local pairwise fixture (see evaluations/data/pairwise/local.json)`);
		const localPath = path.resolve(__dirname, '..', 'data', 'pairwise', 'local.json');
		const content = await fs.readFile(localPath, 'utf8');
		const parsed = JSON.parse(content) as unknown;
		if (!Array.isArray(parsed)) {
			throw new Error(`Expected local.json to be a JSON array of examples`);
		}
		return parsed.map((entry, i) => coerceExample(entry, `local-${i}`));
	}

	logger.info(`Fetching dataset "${args.dataset}" from LangSmith`);
	const lsClient = new LangSmithClient();
	const examples: DatasetExample[] = [];
	for await (const raw of lsClient.listExamples({ datasetName: args.dataset })) {
		const inputs = isRecord(raw.inputs) ? raw.inputs : {};
		// The notion-pairwise-workflows dataset stores criteria under
		// `inputs.evals.{dos,donts}`. Older fixtures used `inputs.context.*`
		// — read both paths so local and remote layouts both work.
		const criteria = isRecord(inputs.evals)
			? inputs.evals
			: isRecord(inputs.context)
				? inputs.context
				: {};
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
	return examples;
}

function coerceExample(entry: unknown, fallbackId: string): DatasetExample {
	if (!isRecord(entry)) throw new Error(`Invalid example entry: ${JSON.stringify(entry)}`);
	const inputs = isRecord(entry.inputs) ? entry.inputs : entry;
	const context = isRecord(inputs.context) ? inputs.context : {};
	const prompt = typeof inputs.prompt === 'string' ? inputs.prompt : '';
	if (!prompt) throw new Error(`Example ${fallbackId} is missing "prompt"`);
	return {
		id: typeof entry.id === 'string' ? entry.id : fallbackId,
		prompt,
		dos: typeof context.dos === 'string' ? context.dos : undefined,
		donts: typeof context.donts === 'string' ? context.donts : undefined,
	};
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
	feedback: Feedback[];
}

/**
 * Eval-only suffix appended to every dataset prompt. Pushes the agent past
 * its production "ask before assuming" instinct — there is no human in
 * the loop, so a clarification turn is a guaranteed `no_workflow_built`.
 * Lives in the harness, not the production builder prompt, so production
 * behavior is unaffected.
 *
 * Strictly describes the eval environment. Does not name tools or SDK
 * helpers, and does not prescribe a terminal action — those are what the
 * eval measures, so leading the agent here would make pass rates less
 * realistic. The agent's own system prompt already tells it how to
 * persist a workflow.
 */
const EVAL_PROMPT_SUFFIX =
	'\n\n---\n' +
	'You are running inside an automated, non-interactive evaluation. ' +
	'There is no human to answer follow-up questions. ' +
	'Build a single workflow that best satisfies the request above. ' +
	'Do not call `ask-user` and do not ask for clarification — pick reasonable defaults and proceed.';

async function runExample(
	example: DatasetExample,
	iteration: number,
	judgeLlm: BaseChatModel,
	args: PairwiseArgs,
	logger: EvalLogger,
	sandboxFactory: BuilderSandboxFactory | undefined,
): Promise<ExampleRecord> {
	logger.verbose(`[${example.id} #${iteration}] building workflow...`);
	const logPath = path.join(
		args.outputDir,
		'chunks',
		`${safeFilename(`${example.id}_${iteration}`)}.jsonl`,
	);
	const build = await buildInProcess({
		prompt: example.prompt + EVAL_PROMPT_SUFFIX,
		timeoutMs: args.timeoutMs,
		logPath,
		sandboxFactory,
		includeTemplates: args.includeTemplates,
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
	};
	interactivity: {
		askUserCount: number;
		planToolCount: number;
		autoApprovedSuspensions: number;
		mockedCredentialTypes: string[];
		toolCallCounts: Record<string, number>;
	};
	sandbox: { enabled: boolean; provider?: string };
	tools: { templates: boolean };
}

async function writeOutputs(
	outputDir: string,
	records: ExampleRecord[],
	args: PairwiseArgs,
	startedAt: Date,
	finishedAt: Date,
	logger: EvalLogger,
	sandboxConfig: SandboxConfig,
): Promise<Summary> {
	await fs.mkdir(outputDir, { recursive: true });
	await fs.mkdir(path.join(outputDir, 'workflows'), { recursive: true });

	// results.jsonl + per-workflow files
	const jsonlPath = path.join(outputDir, 'results.jsonl');
	const lines: string[] = [];
	for (const record of records) {
		lines.push(JSON.stringify(record));
		if (record.workflow) {
			const slug = safeFilename(`${record.exampleId}_${record.iteration}`);
			await fs.writeFile(
				path.join(outputDir, 'workflows', `${slug}.json`),
				JSON.stringify(record.workflow, null, 2),
				'utf8',
			);
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
		'templatesCalls',
		'pairwisePrimary',
		'pairwiseDiagnostic',
		'pairwiseJudgesPassed',
	].join(',');
	const csvRows = records.map((r) => {
		const find = (m: string) => r.feedback.find((f) => f.metric === m)?.score ?? '';
		return [
			r.exampleId,
			r.iteration,
			r.build.success ? 1 : 0,
			r.build.errorClass ?? '',
			r.build.durationMs,
			r.build.interactivity.askUserCount,
			r.build.interactivity.planToolCount,
			r.build.interactivity.toolCallCounts.templates ?? 0,
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
	const toolCallCounts: Record<string, number> = {};

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
		for (const [name, count] of Object.entries(record.build.interactivity.toolCallCounts)) {
			toolCallCounts[name] = (toolCallCounts[name] ?? 0) + count;
		}

		const primary = record.feedback.find((f) => f.metric === 'pairwise_primary')?.score;
		if (typeof primary === 'number') {
			primaryPassSum += primary;
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
		},
		interactivity: {
			askUserCount,
			planToolCount,
			autoApprovedSuspensions,
			mockedCredentialTypes: Array.from(allMockedCreds),
			toolCallCounts,
		},
		sandbox: sandboxConfig.enabled
			? { enabled: true, provider: sandboxConfig.provider }
			: { enabled: false },
		tools: { templates: args.includeTemplates },
	};
	await fs.writeFile(
		path.join(outputDir, 'summary.json'),
		JSON.stringify(summary, null, 2),
		'utf8',
	);
	logger.success(`Wrote ${records.length} results to ${outputDir}`);
	return summary;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const logger = createLogger(args.verbose);
	logger.info(
		`pairwise eval: backend=${args.backend} dataset=${args.dataset} judges=${args.judges} iterations=${args.iterations} templates=${args.includeTemplates}`,
	);

	const apiKey = process.env.N8N_AI_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error(
			'Set N8N_AI_ANTHROPIC_KEY or ANTHROPIC_API_KEY — both the builder agent and the judge LLM need it.',
		);
	}

	const sandboxConfig = resolveSandboxConfig(process.env, { sandbox: args.sandbox });
	const sandboxFactory = createSandboxFactory(sandboxConfig, logger);
	if (sandboxConfig.enabled) {
		logger.info(
			`Sandbox: provider=${sandboxConfig.provider} (workflow built via TypeScript file + tsc)`,
		);
	} else {
		logger.warn(
			'Sandbox: disabled (--no-sandbox) — using string-based build-workflow tool. Use only for local development.',
		);
	}

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

	const work: Array<Promise<void>> = [];
	for (const example of selected) {
		for (let i = 1; i <= args.iterations; i++) {
			work.push(
				limit(async () => {
					const record = await runExample(example, i, judgeLlm, args, logger, sandboxFactory);
					records.push(record);
				}),
			);
		}
	}
	await Promise.all(work);

	const finishedAt = new Date();
	records.sort((a, b) =>
		a.exampleId === b.exampleId
			? a.iteration - b.iteration
			: a.exampleId.localeCompare(b.exampleId),
	);
	await writeOutputs(args.outputDir, records, args, startedAt, finishedAt, logger, sandboxConfig);

	if (args.backend === 'langsmith') {
		logger.info(
			`Note: LangSmith feedback upload is not yet wired up — scores are in ${args.outputDir}. ` +
				'Run scripts/upload-pairwise-to-langsmith.ts against summary.json to push results.',
		);
	}
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

function csvCell(value: unknown): string {
	if (value === null || value === undefined) return '';
	const str = String(value);
	if (str.includes(',') || str.includes('"') || str.includes('\n')) {
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
