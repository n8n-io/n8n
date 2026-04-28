#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Instance AI workflow eval CLI
//
// Runs workflow execution evaluations. When LANGSMITH_API_KEY is set, uses
// LangSmith's evaluate() for experiment tracking and tracing. Otherwise
// falls back to a direct loop with the same eval-results.json output.
// ---------------------------------------------------------------------------

import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { mkdirSync, writeFileSync } from 'fs';
import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import type { EvaluationResult } from 'langsmith/evaluation';
import type { Example, Run } from 'langsmith/schemas';
import { traceable } from 'langsmith/traceable';
import pLimit from 'p-limit';
import { join } from 'path';
import { z } from 'zod';

import { aggregateResults, passAtK, passHatK } from './aggregator';
import { parseCliArgs } from './args';
import { buildCIMetadata, computeExperimentPrefix } from './ci-metadata';
import { N8nClient } from '../clients/n8n-client';
import { seedCredentials, cleanupCredentials } from '../credentials/seeder';
import { loadWorkflowTestCasesWithFiles } from '../data/workflows';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import { createLogger } from '../harness/logger';
import type { EvalLogger } from '../harness/logger';
import {
	buildWorkflow,
	executeScenario,
	cleanupBuild,
	runWorkflowTestCase,
	runWithConcurrency,
	type BuildResult,
} from '../harness/runner';
import { syncDataset, type DatasetExampleInputs } from '../langsmith/dataset-sync';
import { snapshotWorkflowIds } from '../outcome/workflow-discovery';
import { writeWorkflowReport } from '../report/workflow-report';
import type {
	MultiRunEvaluation,
	ScenarioResult,
	TestScenario,
	WorkflowTestCaseResult,
} from '../types';

// n8n degrades above ~4 concurrent builds.
const MAX_CONCURRENT_BUILDS = 4;

const targetOutputSchema = z.object({
	buildSuccess: z.boolean().default(false),
	passed: z.boolean().default(false),
	score: z.number().default(0),
	reasoning: z.string().default(''),
	workflowId: z.string().optional(),
	failureCategory: z.string().optional(),
	rootCause: z.string().optional(),
	execErrors: z.array(z.string()).default([]),
	evalResult: z.unknown().optional(),
	/** Only set on the scenario that initiated the build. */
	buildDurationMs: z.number().optional(),
	execDurationMs: z.number().default(0),
	nodeCount: z.number().default(0),
});

type TargetOutput = Omit<z.infer<typeof targetOutputSchema>, 'evalResult'> & {
	evalResult?: InstanceAiEvalExecutionResult;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isEvalResult(v: unknown): v is InstanceAiEvalExecutionResult {
	if (!isPlainObject(v)) return false;
	return (
		typeof v.nodeResults === 'object' &&
		v.nodeResults !== null &&
		Array.isArray(v.errors) &&
		typeof v.hints === 'object' &&
		v.hints !== null
	);
}

/** Safe-parse a run's outputs. Returns `undefined` if the row is malformed
 *  or missing, so callers can skip it instead of treating it as a genuine
 *  failed evaluation. Every field in the schema has a default, so an empty
 *  or nullish raw value would otherwise parse successfully into a "failed"
 *  shape (passed:false, score:0) — masking infra errors as builder regressions.
 */
function parseTargetOutput(raw: unknown): TargetOutput | undefined {
	if (!isPlainObject(raw) || Object.keys(raw).length === 0) return undefined;
	const parsed = targetOutputSchema.safeParse(raw);
	if (!parsed.success) return undefined;
	return {
		...parsed.data,
		evalResult: isEvalResult(parsed.data.evalResult) ? parsed.data.evalResult : undefined,
	};
}

const runInputsSchema = z
	.object({
		prompt: z.string().default(''),
		testCaseFile: z.string().default(''),
		scenarioName: z.string().default(''),
		/** 0-based iteration index; injected during multi-run expansion. */
		_iteration: z.number().int().nonnegative().default(0),
	})
	.passthrough();

/** Target input shape with the iteration index we inject for multi-run. */
type TargetInputs = DatasetExampleInputs & { _iteration?: number };

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));
	const logger = createLogger(args.verbose);

	const client = new N8nClient(args.baseUrl);
	logger.info(`Authenticating with ${args.baseUrl}...`);
	await client.login(args.email, args.password);
	logger.success('Authenticated');

	logger.info('Seeding credentials...');
	const seedResult = await seedCredentials(client, undefined, logger);
	logger.info(`Seeded ${String(seedResult.credentialIds.length)} credential(s)`);

	const preRunWorkflowIds = await snapshotWorkflowIds(client);
	const claimedWorkflowIds = new Set<string>();

	const startTime = Date.now();

	try {
		const hasLangSmith = Boolean(process.env.LANGSMITH_API_KEY);

		let evaluation: MultiRunEvaluation;

		if (hasLangSmith) {
			logger.info('LangSmith API key detected, using evaluate() with experiment tracking');
			evaluation = await runWithLangSmith({
				args,
				client,
				preRunWorkflowIds,
				claimedWorkflowIds,
				logger,
				seedResult,
			});
		} else {
			logger.info('No LANGSMITH_API_KEY, running direct loop (results in eval-results.json only)');
			evaluation = await runDirectLoop({
				args,
				client,
				preRunWorkflowIds,
				claimedWorkflowIds,
				logger,
				seedResult,
			});
		}

		const totalDuration = Date.now() - startTime;
		const outputPath = writeEvalResults(evaluation, totalDuration, args.outputDir);
		console.log(`Results: ${outputPath}`);
		const htmlPath = writeWorkflowReport(flattenRunsForReport(evaluation));
		console.log(`Report:  ${htmlPath}`);
		printSummary(evaluation);
	} finally {
		await cleanupCredentials(client, seedResult.credentialIds).catch(() => {});
	}
}

// ---------------------------------------------------------------------------
// LangSmith mode: evaluate() with dataset sync, tracing, experiments
// ---------------------------------------------------------------------------

interface RunConfig {
	args: ReturnType<typeof parseCliArgs>;
	client: N8nClient;
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
	logger: EvalLogger;
	seedResult: { seededTypes: string[]; credentialIds: string[] };
}

async function runWithLangSmith(config: RunConfig): Promise<MultiRunEvaluation> {
	const { args, client, preRunWorkflowIds, claimedWorkflowIds, logger } = config;

	const lsClient = new Client();
	const datasetName = await syncDataset(lsClient, args.dataset, logger, args.filter);
	const testCasesWithFiles = loadWorkflowTestCasesWithFiles(args.filter);

	const buildLimiter = pLimit(MAX_CONCURRENT_BUILDS);
	// Keyed by `${iteration}:${prompt}` so the same prompt gets a fresh build
	// per iteration — pass@k captures real builder variance.
	const buildCache = new Map<string, Promise<BuildResult>>();
	const buildDurations = new Map<string, number>();

	// Traceable wraps the actual build call *inside* the limiter — otherwise the
	// LangSmith span would include queue-wait time, which accumulates across
	// iterations as later builds queue behind earlier ones.
	const tracedBuildWorkflow = traceable(
		async (prompt: string) =>
			await buildWorkflow({
				client,
				prompt,
				timeoutMs: args.timeoutMs,
				preRunWorkflowIds,
				claimedWorkflowIds,
				logger,
			}),
		{ name: 'workflow_build', run_type: 'chain', client: lsClient },
	);

	async function getOrBuild(
		prompt: string,
		iteration: number,
	): Promise<{ build: BuildResult; buildDurationMs?: number }> {
		const key = `${String(iteration)}:${prompt}`;
		const existing = buildCache.get(key);
		if (existing) return { build: await existing };
		const promise = buildLimiter(async () => {
			const start = Date.now();
			const build = await tracedBuildWorkflow(prompt);
			buildDurations.set(key, Date.now() - start);
			return build;
		});
		buildCache.set(key, promise);
		const build = await promise;
		return { build, buildDurationMs: buildDurations.get(key) };
	}

	const traceableExecute = traceable(
		async (execArgs: {
			workflowId: string;
			scenario: TestScenario;
			workflowJsons: BuildResult['workflowJsons'];
		}) =>
			await executeScenario(
				client,
				execArgs.workflowId,
				execArgs.scenario,
				execArgs.workflowJsons,
				logger,
				args.timeoutMs,
			),
		{ name: 'scenario_execution', run_type: 'chain', client: lsClient },
	);

	const target = async (inputs: TargetInputs): Promise<TargetOutput> => {
		const iteration = inputs._iteration ?? 0;
		const scenario: TestScenario = {
			name: inputs.scenarioName,
			description: inputs.scenarioDescription,
			dataSetup: inputs.dataSetup,
			successCriteria: inputs.successCriteria,
		};

		const { build, buildDurationMs } = await getOrBuild(inputs.prompt, iteration);

		if (!build.success || !build.workflowId) {
			return {
				buildSuccess: false,
				passed: false,
				score: 0,
				reasoning: `Build failed: ${build.error ?? 'unknown'}`,
				failureCategory: 'build_failure',
				execErrors: build.error ? [build.error] : [],
				buildDurationMs,
				execDurationMs: 0,
				nodeCount: 0,
			};
		}

		const execStart = Date.now();
		const nodeCount = build.workflowJsons[0]?.nodes.length ?? 0;
		let result;
		try {
			result = await traceableExecute({
				workflowId: build.workflowId,
				scenario,
				workflowJsons: build.workflowJsons,
			});
		} catch (error: unknown) {
			// Mirror direct mode's per-scenario guard — without this, n8n API errors
			// or verifier timeouts from executeWithLlmMock / verifyChecklist would
			// escape to LangSmith, come back as a Run with null outputs, and be
			// misclassified as builder regressions by the feedback extractor.
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error(`    ERROR [${scenario.name}]: ${errorMessage}`);
			return {
				buildSuccess: true,
				workflowId: build.workflowId,
				passed: false,
				score: 0,
				reasoning: `Scenario execution error: ${errorMessage}`,
				failureCategory: 'framework_issue',
				execErrors: [errorMessage],
				buildDurationMs,
				execDurationMs: Date.now() - execStart,
				nodeCount,
			};
		}
		const execDurationMs = Date.now() - execStart;

		// Strip failure fields on pass: the verifier sometimes returns "."
		// placeholders instead of omitting them.
		const failureCategory = result.success ? undefined : result.failureCategory;
		const rootCause = result.success ? undefined : result.rootCause;

		return {
			buildSuccess: true,
			workflowId: build.workflowId,
			passed: result.success,
			score: result.score,
			reasoning: result.reasoning,
			failureCategory,
			rootCause,
			execErrors: result.evalResult?.errors ?? [],
			evalResult: result.evalResult,
			buildDurationMs,
			execDurationMs,
			nodeCount,
		};
	};

	const feedbackExtractor = ({ run }: { run: Run }): EvaluationResult[] => {
		const output = parseTargetOutput(run.outputs);
		if (!output) return [];
		// 'none' for passed scenarios so the column shows a full categorical
		// breakdown instead of blank cells.
		const failureCategory = output.passed ? 'none' : (output.failureCategory ?? 'unknown');
		const feedback: EvaluationResult[] = [
			{
				key: 'scenario_pass',
				score: output.score,
				comment: output.reasoning || undefined,
			},
			{
				key: 'failure_category',
				value: failureCategory,
			},
			{
				key: 'exec_duration_s',
				score: output.execDurationMs / 1000,
			},
			{
				key: 'node_count',
				score: output.nodeCount,
			},
		];
		if (output.buildDurationMs !== undefined) {
			feedback.push({ key: 'build_duration_s', score: output.buildDurationMs / 1000 });
		}
		return feedback;
	};

	const experimentPrefix = args.experimentName ?? computeExperimentPrefix();

	logger.info(
		`Starting evaluate() with concurrency=${String(args.concurrency)}, builds limited to ${String(MAX_CONCURRENT_BUILDS)}, iterations=${String(args.iterations)}`,
	);

	const sourceExamples = args.filter
		? filteredExamplesIterable(lsClient, datasetName, args.filter, logger)
		: lsClient.listExamples({ datasetName });
	const evaluateData =
		args.iterations > 1
			? expandExamplesForIterations(sourceExamples, args.iterations)
			: sourceExamples;

	try {
		const evaluateStart = Date.now();
		const experimentResults = await evaluate(target, {
			data: evaluateData,
			evaluators: [feedbackExtractor],
			experimentPrefix,
			maxConcurrency: args.concurrency,
			client: lsClient,
			metadata: {
				filter: args.filter ?? 'all',
				concurrency: args.concurrency,
				maxBuilds: MAX_CONCURRENT_BUILDS,
				iterations: args.iterations,
				...buildCIMetadata(),
			},
		});
		const totalDurationMs = Date.now() - evaluateStart;

		logger.info(`Experiment: ${experimentResults.experimentName}`);
		await lsClient.awaitPendingTraceBatches();

		const allRunResults = reshapeLangSmithRuns(
			experimentResults.results,
			testCasesWithFiles,
			args.iterations,
		);
		const evaluation = aggregateResults(allRunResults, args.iterations);

		await updateExperimentAggregates({
			lsClient,
			experimentName: experimentResults.experimentName,
			runs: experimentResults.results,
			evaluation,
			buildDurations,
			totalDurationMs,
			logger,
		});

		await writePerRunPassMetrics({
			lsClient,
			runs: experimentResults.results,
			logger,
		});

		return evaluation;
	} finally {
		if (!args.keepWorkflows) {
			await Promise.all(
				[...buildCache.values()].map(async (buildPromise) => {
					try {
						const build = await buildPromise;
						await cleanupBuild(client, build, logger);
					} catch {
						// Best-effort
					}
				}),
			);
		}
	}
}

/**
 * Expand a source example stream into N copies, tagging each with `_iteration`
 * so the target function can key its build cache by iteration and we can
 * reshape runs back into per-iteration groups afterwards. All N copies share
 * the source example's id, so LangSmith's UI groups them naturally by
 * `reference_example_id` — useful for pass@k visualization.
 *
 * The source is buffered into memory once before the first yield: we need to
 * emit each example N times, and an AsyncIterable can only be consumed once.
 */
async function* expandExamplesForIterations(
	source: AsyncIterable<Example>,
	iterations: number,
): AsyncIterable<Example> {
	const cached: Example[] = [];
	for await (const ex of source) cached.push(ex);
	for (let i = 0; i < iterations; i++) {
		for (const ex of cached) {
			yield { ...ex, inputs: { ...ex.inputs, _iteration: i } };
		}
	}
}

function filteredExamplesIterable(
	lsClient: Client,
	datasetName: string,
	filter: string,
	logger: EvalLogger,
): AsyncIterable<Example> {
	const slugs = loadWorkflowTestCasesWithFiles(filter).map((tc) => tc.fileSlug);
	if (slugs.length === 0) {
		logger.info(`Filter "${filter}" matched no local test case files`);
		return (async function* () {})();
	}
	logger.info(`Filter "${filter}" matched ${String(slugs.length)} split(s): ${slugs.join(', ')}`);
	return lsClient.listExamples({ datasetName, splits: slugs });
}

async function updateExperimentAggregates(config: {
	lsClient: Client;
	experimentName: string;
	runs: Array<{ run: Run }>;
	evaluation: MultiRunEvaluation;
	buildDurations: Map<string, number>;
	totalDurationMs: number;
	logger: EvalLogger;
}): Promise<void> {
	const { lsClient, experimentName, runs, evaluation, buildDurations, totalDurationMs, logger } =
		config;

	const buildTimes = [...buildDurations.values()];
	const uniqueBuilds = buildTimes.length;
	const avgBuildMs =
		uniqueBuilds > 0 ? buildTimes.reduce((sum, d) => sum + d, 0) / uniqueBuilds : 0;

	const execTimes = runs
		.map(({ run }) => parseTargetOutput(run.outputs)?.execDurationMs)
		.filter((ms): ms is number => typeof ms === 'number');
	const avgExecMs =
		execTimes.length > 0 ? execTimes.reduce((sum, d) => sum + d, 0) / execTimes.length : 0;

	const aggregates = {
		duration_s: Math.round(totalDurationMs / 100) / 10,
		avg_build_s: Math.round(avgBuildMs / 100) / 10,
		avg_exec_s: Math.round(avgExecMs / 100) / 10,
		unique_builds: uniqueBuilds,
		pass_rate_per_iter: computePassRatePerIter(evaluation),
	};

	try {
		const project = await lsClient.readProject({ projectName: experimentName });
		// `updateProject` replaces `extra` wholesale — preserve it so auto-set
		// fields (splits, etc.) survive. Narrow via typeof guards rather than `as`.
		const existingExtra = isPlainObject(project.extra) ? project.extra : {};
		const existingMetadata = isPlainObject(existingExtra.metadata) ? existingExtra.metadata : {};
		await lsClient.updateProject(project.id, {
			projectExtra: existingExtra,
			metadata: { ...existingMetadata, ...aggregates },
		});
		logger.verbose(`Updated experiment metadata: ${JSON.stringify(aggregates)}`);
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		logger.verbose(`Could not update experiment metadata: ${msg}`);
	}
}

/**
 * Attach per-example pass metrics (pass_rate, pass_at_k, pass_hat_k) as
 * feedback on every run in the example's group. All N runs of the same example
 * carry the same value — that lets the LangSmith UI sort/filter individual
 * runs by their example's metric, and its per-experiment column aggregation
 * reduces to the mean across unique examples.
 */
async function writePerRunPassMetrics(config: {
	lsClient: Client;
	runs: Array<{ run: Run }>;
	logger: EvalLogger;
}): Promise<void> {
	const { lsClient, runs, logger } = config;

	// Group runs by reference_example_id, counting passes.
	const byExample = new Map<string, { runIds: string[]; passed: number; total: number }>();
	for (const { run } of runs) {
		const exampleId = run.reference_example_id;
		if (!exampleId) continue;
		const output = parseTargetOutput(run.outputs);
		if (!output) continue;
		const entry = byExample.get(exampleId) ?? { runIds: [], passed: 0, total: 0 };
		entry.runIds.push(run.id);
		entry.total++;
		if (output.passed) entry.passed++;
		byExample.set(exampleId, entry);
	}

	// Individual writes are best-effort: a transient API error on one run
	// shouldn't block the rest, so we swallow per-promise and keep going.
	const feedbackWrites: Array<Promise<unknown>> = [];
	for (const { runIds, passed, total } of byExample.values()) {
		const passAtKValue = passAtK(total, passed, total);
		const passHatKValue = passHatK(total, passed, total);
		for (const runId of runIds) {
			feedbackWrites.push(
				lsClient.createFeedback(runId, 'pass_at_k', { score: passAtKValue }).catch(() => {}),
				lsClient.createFeedback(runId, 'pass_hat_k', { score: passHatKValue }).catch(() => {}),
			);
		}
	}

	await Promise.all(feedbackWrites);
	logger.verbose(
		`Wrote pass metrics feedback for ${String(byExample.size)} example(s) across ${String(runs.length)} run(s)`,
	);
}

/**
 * Convert LangSmith's flat `Run[]` into the `WorkflowTestCaseResult[][]` shape
 * the aggregator expects (outer: runs, inner: test cases). Groups by
 * (testCaseFile, scenarioName), then reconstructs per-iteration test case
 * results. Scenarios with no matching run get a build_failure stub.
 */
function reshapeLangSmithRuns(
	rows: Array<{ run: Run }>,
	testCasesWithFiles: WorkflowTestCaseWithFile[],
	numIterations: number,
): WorkflowTestCaseResult[][] {
	// Index runs by (iteration, testCaseFile, scenarioName) using the `_iteration`
	// we injected in expandExamplesForIterations. Falls back to 0 for single-run.
	const byKey = new Map<string, Run>();
	for (const { run } of rows) {
		const inputs = runInputsSchema.safeParse(run.inputs ?? {});
		if (!inputs.success) continue;
		const key = `${String(inputs.data._iteration)}/${inputs.data.testCaseFile}/${inputs.data.scenarioName}`;
		byKey.set(key, run);
	}

	const allRunResults: WorkflowTestCaseResult[][] = [];
	for (let iter = 0; iter < numIterations; iter++) {
		const runResults: WorkflowTestCaseResult[] = [];
		for (const { testCase, fileSlug } of testCasesWithFiles) {
			const scenarioResults: ScenarioResult[] = [];
			let workflowBuildSuccess = false;
			let workflowId: string | undefined;
			let buildError: string | undefined;

			for (const scenario of testCase.scenarios) {
				const run = byKey.get(`${String(iter)}/${fileSlug}/${scenario.name}`);
				const output = run ? parseTargetOutput(run.outputs) : undefined;
				if (!run || !output) {
					scenarioResults.push({
						scenario,
						success: false,
						score: 0,
						reasoning: run ? 'Malformed run output — skipped' : 'No run result for this scenario',
					});
					continue;
				}
				if (output.buildSuccess) workflowBuildSuccess = true;
				if (output.workflowId) workflowId = output.workflowId;
				if (!output.buildSuccess && output.reasoning) buildError = output.reasoning;
				scenarioResults.push({
					scenario,
					success: output.passed,
					evalResult: output.evalResult,
					score: output.score,
					reasoning: output.reasoning,
					failureCategory: output.failureCategory,
					rootCause: output.rootCause,
				});
			}

			runResults.push({
				testCase,
				workflowBuildSuccess,
				workflowId,
				scenarioResults,
				buildError,
			});
		}
		allRunResults.push(runResults);
	}
	return allRunResults;
}

// ---------------------------------------------------------------------------
// Direct mode: simple loop, no LangSmith dependency
// ---------------------------------------------------------------------------

async function runDirectLoop(config: RunConfig): Promise<MultiRunEvaluation> {
	const { args, client, preRunWorkflowIds, claimedWorkflowIds, logger, seedResult } = config;

	const testCasesWithFiles = loadWorkflowTestCasesWithFiles(args.filter);
	if (testCasesWithFiles.length === 0) {
		console.log('No workflow test cases found in evaluations/data/workflows/');
		return { totalRuns: 0, testCases: [] };
	}

	const totalScenarios = testCasesWithFiles.reduce(
		(sum, { testCase }) => sum + testCase.scenarios.length,
		0,
	);
	logger.info(
		`Running ${String(testCasesWithFiles.length)} test case(s) with ${String(totalScenarios)} scenario(s) × ${String(args.iterations)} iteration(s)`,
	);

	const allRunResults: WorkflowTestCaseResult[][] = [];
	for (let iter = 0; iter < args.iterations; iter++) {
		if (args.iterations > 1) {
			logger.info(`--- Iteration #${String(iter + 1)}/${String(args.iterations)} ---`);
		}
		const results = await runWithConcurrency(
			testCasesWithFiles,
			async ({ testCase }) =>
				await runWorkflowTestCase({
					client,
					testCase,
					timeoutMs: args.timeoutMs,
					seededCredentialTypes: seedResult.seededTypes,
					preRunWorkflowIds,
					claimedWorkflowIds,
					logger,
					keepWorkflows: args.keepWorkflows,
				}),
			MAX_CONCURRENT_BUILDS,
		);
		allRunResults.push(results);
	}

	return aggregateResults(allRunResults, args.iterations);
}

// ---------------------------------------------------------------------------
// eval-results.json output (same shape as CI PR comment expects)
// ---------------------------------------------------------------------------

/**
 * Flatten per-iteration runs into a single list of test-case results for the
 * HTML report. Previously we rendered only `tc.runs[0]`, which silently hid
 * iterations 2..N — a flaky scenario that passed once and failed twice would
 * appear clean in the uploaded artifact. For multi-iteration runs we prefix
 * each prompt with its iteration number so the cards are distinguishable at
 * a glance.
 */
function flattenRunsForReport(evaluation: MultiRunEvaluation): WorkflowTestCaseResult[] {
	if (evaluation.totalRuns <= 1) {
		return evaluation.testCases.map((tc) => tc.runs[0]);
	}
	return evaluation.testCases.flatMap((tc) =>
		tc.runs.map((run, iter) => ({
			...run,
			testCase: {
				...run.testCase,
				prompt: `[iter ${String(iter + 1)}/${String(evaluation.totalRuns)}] ${run.testCase.prompt}`,
			},
		})),
	);
}

interface AggregateMetrics {
	/** Number of test cases with at least one successful build across iterations. */
	built: number;
	/** Total scenarios across all test cases. */
	scenariosTotal: number;
	/** Mean pass@k across scenarios at k = totalRuns (0..1). */
	passAtK: number;
	/** Mean pass^k across scenarios at k = totalRuns (0..1). */
	passHatK: number;
	/** Index into each scenario's passAtK/passHatK array for k = totalRuns. */
	kIndex: number;
	/** Pass rate of each iteration formatted as e.g. "37% / 37% / 37%". */
	passRatePerIter: string;
}

function computeAggregateMetrics(evaluation: MultiRunEvaluation): AggregateMetrics {
	const { totalRuns, testCases } = evaluation;
	const allScenarios = testCases.flatMap((tc) => tc.scenarios);
	const total = allScenarios.length;
	const kIndex = Math.max(totalRuns - 1, 0);
	const built = testCases.filter((tc) => tc.buildSuccessCount > 0).length;
	const passAtK =
		total > 0 ? allScenarios.reduce((sum, s) => sum + (s.passAtK[kIndex] ?? 0), 0) / total : 0;
	const passHatK =
		total > 0 ? allScenarios.reduce((sum, s) => sum + (s.passHatK[kIndex] ?? 0), 0) / total : 0;
	return {
		built,
		scenariosTotal: total,
		passAtK,
		passHatK,
		kIndex,
		passRatePerIter: computePassRatePerIter(evaluation),
	};
}

/** Pass rate of each iteration formatted as e.g. "37% / 37% / 37%". */
function computePassRatePerIter(evaluation: MultiRunEvaluation): string {
	const { totalRuns, testCases } = evaluation;
	const allScenarios = testCases.flatMap((tc) => tc.scenarios);
	if (allScenarios.length === 0) return '';
	const rates: string[] = [];
	for (let i = 0; i < totalRuns; i++) {
		const passed = allScenarios.filter((s) => s.runs[i]?.success).length;
		rates.push(`${String(Math.round((passed / allScenarios.length) * 100))}%`);
	}
	return rates.join(' / ');
}

function writeEvalResults(
	evaluation: MultiRunEvaluation,
	duration: number,
	outputDir?: string,
): string {
	const { totalRuns, testCases } = evaluation;
	const metrics = computeAggregateMetrics(evaluation);

	const report = {
		timestamp: new Date().toISOString(),
		duration,
		totalRuns,
		summary: {
			testCases: testCases.length,
			built: metrics.built,
			scenariosTotal: metrics.scenariosTotal,
			passAtK: metrics.passAtK,
			passHatK: metrics.passHatK,
			passRatePerIter: metrics.passRatePerIter,
		},
		testCases: testCases.map((tc) => ({
			name: tc.testCase.prompt.slice(0, 70),
			buildSuccessCount: tc.buildSuccessCount,
			totalRuns,
			scenarios: tc.scenarios.map((sa) => ({
				name: sa.scenario.name,
				passCount: sa.passCount,
				totalRuns,
				passAtK: sa.passAtK[metrics.kIndex] ?? 0,
				passHatK: sa.passHatK[metrics.kIndex] ?? 0,
				runs: sa.runs.map((sr) => ({
					passed: sr.success,
					score: sr.score,
					reasoning: sr.reasoning,
					failureCategory: sr.failureCategory,
					rootCause: sr.rootCause,
					execErrors: sr.evalResult?.errors ?? [],
					evalResult: sr.evalResult,
				})),
			})),
		})),
	};

	const targetDir = outputDir ?? process.cwd();
	mkdirSync(targetDir, { recursive: true });
	const outputPath = join(targetDir, 'eval-results.json');
	writeFileSync(outputPath, JSON.stringify(report, null, 2));
	return outputPath;
}

// ---------------------------------------------------------------------------
// Console summary
// ---------------------------------------------------------------------------

function printSummary(evaluation: MultiRunEvaluation): void {
	const { totalRuns, testCases } = evaluation;
	const multiRun = totalRuns > 1;
	const metrics = computeAggregateMetrics(evaluation);

	console.log('\n=== Workflow Eval Results ===\n');
	for (const tc of testCases) {
		console.log(`${tc.testCase.prompt.slice(0, 70)}...`);

		if (multiRun) {
			console.log(`  Build: ${String(tc.buildSuccessCount)}/${String(totalRuns)} runs`);
		} else {
			const r = tc.runs[0];
			const buildStatus = r.workflowBuildSuccess ? 'BUILT' : 'BUILD FAILED';
			console.log(`  Workflow: ${buildStatus}${r.workflowId ? ` (${r.workflowId})` : ''}`);
			if (r.buildError) {
				console.log(`  Error: ${r.buildError.slice(0, 200)}`);
			}
		}

		for (const sa of tc.scenarios) {
			if (multiRun) {
				const passAtK = Math.round((sa.passAtK[metrics.kIndex] ?? 0) * 100);
				const passHatK = Math.round((sa.passHatK[metrics.kIndex] ?? 0) * 100);
				console.log(
					`  ${sa.scenario.name}: ${String(sa.passCount)}/${String(totalRuns)} passed` +
						` | pass@${String(totalRuns)}: ${String(passAtK)}% | pass^${String(totalRuns)}: ${String(passHatK)}%`,
				);
			} else {
				const sr = sa.runs[0];
				const icon = sr.success ? '✓' : '✗';
				const category = sr.failureCategory ? ` [${sr.failureCategory}]` : '';
				console.log(
					`  ${icon} ${sr.scenario.name}: ${sr.success ? 'PASS' : 'FAIL'}${category} (${String(sr.score * 100)}%)`,
				);
				if (!sr.success) {
					const execErrors = sr.evalResult?.errors ?? [];
					if (execErrors.length > 0) {
						console.log(`    Error: ${execErrors.join('; ').slice(0, 200)}`);
					}
					console.log(`    Diagnosis: ${sr.reasoning.slice(0, 200)}`);
				}
			}
		}
		console.log('');
	}

	if (multiRun) {
		console.log(
			`${String(metrics.built)}/${String(testCases.length)} built | pass@${String(totalRuns)}: ${String(Math.round(metrics.passAtK * 100))}% | pass^${String(totalRuns)}: ${String(Math.round(metrics.passHatK * 100))}% | iterations: ${metrics.passRatePerIter}`,
		);
	} else {
		const allScenarios = testCases.flatMap((tc) => tc.scenarios);
		const passed = allScenarios.filter((s) => s.runs[0]?.success).length;
		const total = metrics.scenariosTotal;
		console.log(
			`${String(metrics.built)}/${String(testCases.length)} built | ${String(passed)}/${String(total)} passed (${String(total > 0 ? Math.round((passed / total) * 100) : 0)}%)`,
		);
	}
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
