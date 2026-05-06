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
import { join } from 'path';
import { z } from 'zod';

import { aggregateResults, passAtK, passHatK } from './aggregator';
import { parseCliArgs } from './args';
import { buildCIMetadata, computeExperimentPrefix } from './ci-metadata';
import { LaneAllocator } from './lane-allocator';
import { expandWithIterations, partitionRoundRobin } from './lanes';
import { N8nClient } from '../clients/n8n-client';
import {
	compareBuckets,
	type ComparisonOutcome,
	type ComparisonResult,
	type ExperimentBucket,
	type ScenarioCounts,
} from '../comparison/compare';
import { fetchBaselineBucket, findLatestBaseline } from '../comparison/fetch-baseline';
import { formatComparisonMarkdown, formatComparisonTerminal } from '../comparison/format';
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
	WorkflowTestCase,
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

interface Lane {
	client: N8nClient;
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
	seedResult: { seededTypes: string[]; credentialIds: string[] };
}

interface RunConfig {
	args: ReturnType<typeof parseCliArgs>;
	lanes: Lane[];
	logger: EvalLogger;
}

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));
	const logger = createLogger(args.verbose);

	// One lane per base URL. The LangSmith path then uses a work-stealing
	// allocator (lane-allocator.ts) to dispatch builds across lanes; the direct
	// path partitions test cases statically per lane.
	const lanes: Lane[] = await Promise.all(
		args.baseUrls.map(async (baseUrl, idx) => {
			const tag =
				args.baseUrls.length > 1
					? ` [lane ${String(idx + 1)}/${String(args.baseUrls.length)}]`
					: '';
			const client = new N8nClient(baseUrl);
			logger.info(`Authenticating with ${baseUrl}...${tag}`);
			await client.login(args.email, args.password);
			logger.success(`Authenticated${tag}`);

			logger.info(`Seeding credentials...${tag}`);
			const seedResult = await seedCredentials(client, undefined, logger);
			logger.info(`Seeded ${String(seedResult.credentialIds.length)} credential(s)${tag}`);

			const preRunWorkflowIds = await snapshotWorkflowIds(client);
			const claimedWorkflowIds = new Set<string>();
			return { client, preRunWorkflowIds, claimedWorkflowIds, seedResult };
		}),
	);

	const startTime = Date.now();

	try {
		const hasLangSmith = Boolean(process.env.LANGSMITH_API_KEY);

		let evaluation: MultiRunEvaluation;
		let experimentName: string | undefined;
		let outcome: ComparisonOutcome | undefined;
		let slugByTestCase: Map<WorkflowTestCase, string> | undefined;

		if (hasLangSmith) {
			logger.info('LangSmith API key detected, using evaluate() with experiment tracking');
			const langsmithRun = await runWithLangSmith({ args, lanes, logger });
			evaluation = langsmithRun.evaluation;
			experimentName = langsmithRun.experimentName;
			outcome = langsmithRun.outcome;
			slugByTestCase = langsmithRun.slugByTestCase;
		} else {
			logger.info('No LANGSMITH_API_KEY, running direct loop (results in eval-results.json only)');
			evaluation = await runDirectLoop({ args, lanes, logger });
		}

		const totalDuration = Date.now() - startTime;
		const commitSha = process.env.LANGSMITH_REVISION_ID ?? process.env.GITHUB_SHA;
		const { jsonPath, prCommentPath } = writeEvalResults(
			evaluation,
			totalDuration,
			args.outputDir,
			experimentName,
			outcome,
			commitSha,
			slugByTestCase,
		);
		console.log(`Results:    ${jsonPath}`);
		console.log(`PR comment: ${prCommentPath}`);
		const htmlPath = writeWorkflowReport(flattenRunsForReport(evaluation));
		console.log(`Report:     ${htmlPath}`);
		console.log(
			'\n' + formatComparisonTerminal(evaluation, outcome, { commitSha, slugByTestCase }),
		);
	} finally {
		await Promise.all(
			lanes.map(async (lane) => {
				await cleanupCredentials(lane.client, lane.seedResult.credentialIds).catch(() => {});
			}),
		);
	}
}

// ---------------------------------------------------------------------------
// LangSmith mode: evaluate() with dataset sync, tracing, experiments
// ---------------------------------------------------------------------------

async function runWithLangSmith(config: RunConfig): Promise<{
	evaluation: MultiRunEvaluation;
	experimentName: string;
	outcome: ComparisonOutcome;
	slugByTestCase: Map<WorkflowTestCase, string>;
}> {
	const { args, lanes, logger } = config;

	const lsClient = new Client();
	const datasetName = await syncDataset(lsClient, args.dataset, logger, args.filter);
	const testCasesWithFiles = loadWorkflowTestCasesWithFiles(args.filter);

	// LaneState carries the allocator-managed counters (activeBuilds,
	// inflightPrompts) plus the lane's traced LangSmith wrappers. `runner` is
	// the underlying Lane (n8n client, credential state) — named distinctly so
	// it doesn't shadow the iteration variable `lane` in lanes.map().
	interface LaneState {
		runner: Lane;
		activeBuilds: number;
		inflightPrompts: Set<string>;
		tracedBuild: (prompt: string) => Promise<BuildResult>;
		tracedExecute: (execArgs: {
			workflowId: string;
			scenario: TestScenario;
			workflowJsons: BuildResult['workflowJsons'];
		}) => Promise<Awaited<ReturnType<typeof executeScenario>>>;
	}

	const laneStates: LaneState[] = lanes.map((lane, idx) => {
		const laneNum = idx + 1;
		const laneTag = lanes.length > 1 ? ` [lane ${String(laneNum)}/${String(lanes.length)}]` : '';
		return {
			runner: lane,
			activeBuilds: 0,
			inflightPrompts: new Set<string>(),
			tracedBuild: traceable(
				async (prompt: string) =>
					await buildWorkflow({
						client: lane.client,
						prompt,
						timeoutMs: args.timeoutMs,
						preRunWorkflowIds: lane.preRunWorkflowIds,
						claimedWorkflowIds: lane.claimedWorkflowIds,
						logger,
						laneTag,
					}),
				{
					name: 'workflow_build',
					run_type: 'chain',
					client: lsClient,
					metadata: { lane: laneNum },
				},
			),
			tracedExecute: traceable(
				async (execArgs: {
					workflowId: string;
					scenario: TestScenario;
					workflowJsons: BuildResult['workflowJsons'];
				}) =>
					await executeScenario(
						lane.client,
						execArgs.workflowId,
						execArgs.scenario,
						execArgs.workflowJsons,
						logger,
						args.timeoutMs,
					),
				{
					name: 'scenario_execution',
					run_type: 'chain',
					client: lsClient,
					metadata: { lane: laneNum },
				},
			),
		};
	});

	// Work-stealing: each build acquires a lane that isn't already running its
	// prompt, runs there (capped per-lane), then releases. Scenarios re-use the
	// lane that built their workflow.
	const allocator = new LaneAllocator(laneStates, MAX_CONCURRENT_BUILDS);
	const buildCache = new Map<
		string,
		Promise<{ build: BuildResult; lane: LaneState; buildDurationMs: number }>
	>();
	const buildDurations = new Map<string, number>();

	async function getOrBuild(
		prompt: string,
		iteration: number,
	): Promise<{ build: BuildResult; lane: LaneState; buildDurationMs: number }> {
		const key = `${String(iteration)}:${prompt}`;
		const existing = buildCache.get(key);
		if (existing) return await existing;
		const promise = (async () => {
			const lane = await allocator.acquire(prompt);
			try {
				const start = Date.now();
				const build = await lane.tracedBuild(prompt);
				const buildDurationMs = Date.now() - start;
				buildDurations.set(key, buildDurationMs);
				return { build, lane, buildDurationMs };
			} finally {
				allocator.release(lane, prompt);
			}
		})();
		buildCache.set(key, promise);
		return await promise;
	}

	const target = async (inputs: TargetInputs): Promise<TargetOutput> => {
		const iteration = inputs._iteration ?? 0;
		const scenario: TestScenario = {
			name: inputs.scenarioName,
			description: inputs.scenarioDescription,
			dataSetup: inputs.dataSetup,
			successCriteria: inputs.successCriteria,
		};

		const {
			build,
			lane: builtOnLane,
			buildDurationMs,
		} = await getOrBuild(inputs.prompt, iteration);

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
			result = await builtOnLane.tracedExecute({
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
		`Starting evaluate() with concurrency=${String(args.concurrency)}, ${String(lanes.length)} lane(s) × ${String(MAX_CONCURRENT_BUILDS)} concurrent builds, iterations=${String(args.iterations)}`,
	);

	// Always filter the LangSmith dataset by the local file slugs. The local
	// JSON files are the source of truth; the dataset accumulates orphans (the
	// sync is additive — see langsmith/dataset-sync.ts) and we don't want to
	// run scenarios whose JSON file no longer exists.
	const sourceExamples = filteredExamplesIterable(lsClient, datasetName, args.filter, logger);
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
				lanes: lanes.length,
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

		const outcome = await tryRunComparison({
			lsClient,
			prExperimentName: experimentResults.experimentName,
			evaluation,
			testCasesWithFiles,
			logger,
		});

		const slugByTestCase = new Map<WorkflowTestCase, string>(
			testCasesWithFiles.map(({ testCase, fileSlug }) => [testCase, fileSlug]),
		);

		return {
			evaluation,
			experimentName: experimentResults.experimentName,
			outcome,
			slugByTestCase,
		};
	} finally {
		if (!args.keepWorkflows) {
			await Promise.all(
				[...buildCache.values()].map(async (promise) => {
					try {
						const { build, lane } = await promise;
						await cleanupBuild(lane.runner.client, build, logger);
					} catch {
						// Best-effort
					}
				}),
			);
		}
	}
}

/**
 * Expand a source example stream into N copies, tagging each with `_iteration`.
 * Round-robins scenarios across test cases and iter-interleaves per scenario
 * so the in-flight set spans both dimensions. Concentration is handled by the
 * work-stealing allocator at build time.
 */
async function* expandExamplesForIterations(
	source: AsyncIterable<Example>,
	iterations: number,
): AsyncIterable<Example> {
	const cached: Example[] = [];
	for await (const ex of source) cached.push(ex);
	yield* expandWithIterations(
		cached,
		(ex) => (typeof ex.inputs?.testCaseFile === 'string' ? ex.inputs.testCaseFile : 'unknown'),
		iterations,
		(ex, i) => ({ ...ex, inputs: { ...ex.inputs, _iteration: i } }),
	);
}

function filteredExamplesIterable(
	lsClient: Client,
	datasetName: string,
	filter: string | undefined,
	logger: EvalLogger,
): AsyncIterable<Example> {
	const slugs = loadWorkflowTestCasesWithFiles(filter).map((tc) => tc.fileSlug);
	const label = filter ? `Filter "${filter}"` : 'Local test cases';
	if (slugs.length === 0) {
		logger.info(`${label} matched no local test case files`);
		return (async function* () {})();
	}
	logger.info(`${label} matched ${String(slugs.length)} split(s): ${slugs.join(', ')}`);
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
	const { args, lanes, logger } = config;

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
		`Running ${String(testCasesWithFiles.length)} test case(s) with ${String(totalScenarios)} scenario(s) × ${String(args.iterations)} iteration(s) across ${String(lanes.length)} lane(s)`,
	);

	// Distribute test cases across lanes by source-order index. Each bucket carries
	// the original index so we can re-sort lane outputs back to source order — the
	// aggregator indexes per-iteration results positionally.
	const indexed = testCasesWithFiles.map((tc, origIdx) => ({ tc, origIdx }));
	const buckets = partitionRoundRobin(indexed, lanes.length);

	// Iterations are independent — run them in parallel.
	const allRunResults: WorkflowTestCaseResult[][] = await Promise.all(
		Array.from({ length: args.iterations }, async (_unused, iter) => {
			if (args.iterations > 1) {
				logger.info(`--- Iteration #${String(iter + 1)}/${String(args.iterations)} starting ---`);
			}
			const laneResults = await Promise.all(
				lanes.map(async (lane, laneIdx) => {
					const bucket = buckets[laneIdx];
					const laneTag =
						lanes.length > 1 ? ` [lane ${String(laneIdx + 1)}/${String(lanes.length)}]` : '';
					const results = await runWithConcurrency(
						bucket,
						async ({ tc }) =>
							await runWorkflowTestCase({
								client: lane.client,
								testCase: tc.testCase,
								timeoutMs: args.timeoutMs,
								seededCredentialTypes: lane.seedResult.seededTypes,
								preRunWorkflowIds: lane.preRunWorkflowIds,
								claimedWorkflowIds: lane.claimedWorkflowIds,
								logger,
								keepWorkflows: args.keepWorkflows,
								laneTag,
							}),
						MAX_CONCURRENT_BUILDS,
					);
					return bucket.map((b, i) => ({ origIdx: b.origIdx, result: results[i] }));
				}),
			);
			const flat = laneResults.flat();
			flat.sort((a, b) => a.origIdx - b.origIdx);
			return flat.map((x) => x.result);
		}),
	);

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
	outputDir: string | undefined,
	experimentName: string | undefined,
	outcome: ComparisonOutcome | undefined,
	commitSha: string | undefined,
	slugByTestCase: Map<WorkflowTestCase, string> | undefined,
): { jsonPath: string; prCommentPath: string } {
	const { totalRuns, testCases } = evaluation;
	const metrics = computeAggregateMetrics(evaluation);

	const result = outcome?.kind === 'ok' ? outcome.result : undefined;

	const report = {
		timestamp: new Date().toISOString(),
		duration,
		totalRuns,
		experimentName,
		summary: {
			testCases: testCases.length,
			built: metrics.built,
			scenariosTotal: metrics.scenariosTotal,
			passAtK: metrics.passAtK,
			passHatK: metrics.passHatK,
			passRatePerIter: metrics.passRatePerIter,
		},
		// Structured comparison payload only — the rendered markdown lives in
		// the sibling `eval-pr-comment.md` file so consumers can pick the format
		// they want without re-running the eval. `comparisonStatus` records why
		// the comparison was skipped when applicable, so JSON consumers can
		// distinguish "no baseline yet" from "regression detection broke".
		comparison: result
			? {
					baseline: result.baseline.experimentName,
					result: serializeComparison(result),
				}
			: undefined,
		comparisonStatus: outcome?.kind ?? 'not_attempted',
		comparisonError: outcome?.kind === 'fetch_failed' ? outcome.error : undefined,
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
	const jsonPath = join(targetDir, 'eval-results.json');
	writeFileSync(jsonPath, JSON.stringify(report, null, 2));

	// Always write the rendered PR comment — the markdown formatter handles
	// both with-comparison and no-baseline cases. CI consumes this file
	// directly; local users get a copy-pasteable artifact.
	const prCommentPath = join(targetDir, 'eval-pr-comment.md');
	writeFileSync(
		prCommentPath,
		formatComparisonMarkdown(evaluation, outcome, { commitSha, slugByTestCase }),
	);

	return { jsonPath, prCommentPath };
}

/**
 * Convert ComparisonResult into a JSON-serializable shape (Maps don't survive
 * JSON.stringify by default).
 */
function serializeComparison(result: ComparisonResult): {
	pr: { experimentName: string };
	baseline: { experimentName: string };
	aggregate: ComparisonResult['aggregate'];
	scenarios: ComparisonResult['scenarios'];
	prOnly: ComparisonResult['prOnly'];
	baselineOnly: ComparisonResult['baselineOnly'];
	failureCategories: ComparisonResult['failureCategories'];
} {
	return {
		pr: result.pr,
		baseline: result.baseline,
		aggregate: result.aggregate,
		scenarios: result.scenarios,
		prOnly: result.prOnly,
		baselineOnly: result.baselineOnly,
		failureCategories: result.failureCategories,
	};
}

// ---------------------------------------------------------------------------
// Comparison vs the pinned baseline experiment
// ---------------------------------------------------------------------------

/**
 * Best-effort comparison. Returns a tagged outcome so the PR comment can
 * distinguish "no baseline yet" / "this run IS the baseline" from a real
 * regression-detection outage (LangSmith down, fetch failure). Never throws
 * — the eval run is not gated on the comparison.
 */
async function tryRunComparison(config: {
	lsClient: Client;
	prExperimentName: string;
	evaluation: MultiRunEvaluation;
	testCasesWithFiles: WorkflowTestCaseWithFile[];
	logger: EvalLogger;
}): Promise<ComparisonOutcome> {
	const { lsClient, prExperimentName, evaluation, testCasesWithFiles, logger } = config;

	try {
		const baselineName = await findLatestBaseline(lsClient);
		if (!baselineName) {
			logger.verbose(
				'No baseline experiment found — skipping comparison. ' +
					'Run with --experiment-name instance-ai-baseline to create one.',
			);
			return { kind: 'no_baseline' };
		}
		if (baselineName === prExperimentName) {
			logger.verbose('Current run is the baseline — skipping comparison.');
			return { kind: 'self_baseline', experimentName: baselineName };
		}

		logger.info(`Comparing against baseline: ${baselineName}`);
		const baseline = await fetchBaselineBucket(lsClient, baselineName);
		const pr = bucketFromEvaluation(evaluation, testCasesWithFiles, prExperimentName);
		return { kind: 'ok', result: compareBuckets(pr, baseline) };
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		logger.warn(`Comparison vs baseline failed: ${msg}`);
		return { kind: 'fetch_failed', error: msg };
	}
}

/**
 * Project the in-memory MultiRunEvaluation onto the bucket shape used by
 * fetchBaselineBucket, keyed by `${fileSlug}/${scenarioName}`.
 *
 * Looks up `fileSlug` by test case reference rather than array index — the
 * comparison key depends on getting the right slug, and zipping by index
 * silently miscompares if anything ever reorders the aggregate.
 */
function bucketFromEvaluation(
	evaluation: MultiRunEvaluation,
	testCasesWithFiles: WorkflowTestCaseWithFile[],
	experimentName: string,
): ExperimentBucket {
	const slugByTestCase = new Map(
		testCasesWithFiles.map(({ testCase, fileSlug }) => [testCase, fileSlug]),
	);
	const scenarios = new Map<string, ScenarioCounts>();
	const failureCategoryTotals: Record<string, number> = {};
	let trialTotal = 0;
	for (const tc of evaluation.testCases) {
		const fileSlug = slugByTestCase.get(tc.testCase);
		if (!fileSlug) {
			throw new Error(
				`bucketFromEvaluation: no fileSlug for test case "${tc.testCase.prompt.slice(0, 60)}"`,
			);
		}
		const total = tc.runs.length;
		for (const sa of tc.scenarios) {
			const key = `${fileSlug}/${sa.scenario.name}`;
			const failureCategories: Record<string, number> = {};
			for (const sr of sa.runs) {
				trialTotal++;
				if (!sr.success && sr.failureCategory) {
					failureCategories[sr.failureCategory] = (failureCategories[sr.failureCategory] ?? 0) + 1;
					failureCategoryTotals[sr.failureCategory] =
						(failureCategoryTotals[sr.failureCategory] ?? 0) + 1;
				}
			}
			scenarios.set(key, {
				testCaseFile: fileSlug,
				scenarioName: sa.scenario.name,
				passed: sa.passCount,
				total,
				failureCategories,
			});
		}
	}
	return { experimentName, scenarios, failureCategoryTotals, trialTotal };
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
