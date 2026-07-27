// ---------------------------------------------------------------------------
// LangSmith driver — evaluate() with dataset sync, tracing, experiments and
// baseline comparison (TRUST-261). Builds the shared eval session with a
// traceable() hook (span names unchanged) and feeds dataset example rows into
// the case pipeline; everything after the rows — reshape, aggregation,
// experiment metadata, per-run pass metrics, gate/baseline comparison — also
// lives here because it reads or writes LangSmith state.
// ---------------------------------------------------------------------------

import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import type { EvaluationResult } from 'langsmith/evaluation';
import type { Example, Run } from 'langsmith/schemas';
import { traceable } from 'langsmith/traceable';

import { aggregateResults, passAtK, passHatK } from './aggregator';
import { type Lane, type McpBuildSpend } from './build-orchestrator';
import { buildCIMetadata, computeExperimentPrefix } from './ci-metadata';
import { createEvalSession, MAX_CONCURRENT_BUILDS } from './eval-session';
import { expandWithIterations } from './iterations';
import { computePassRatePerIter, summarizeMcpBuildSpend } from './persist';
import { isPlainObject, parseTargetOutput, reshapeLangSmithRuns } from './reshape';
import { partialIsolationWarning } from '../cli/args';
import type { CliArgs } from '../cli/args';
import { bucketFromEvaluation } from '../comparison/bucket-from-evaluation';
import { compareBuckets, type ComparisonOutcome } from '../comparison/compare';
import { fetchBaselineBucket, findLatestBaseline } from '../comparison/fetch-baseline';
import { isGatedTier } from '../comparison/gate';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import { EVAL_WORKSPACE_NAME, resolveEvalWorkspaceId } from '../harness/langsmith-seed';
import type { EvalLogger } from '../harness/logger';
import type { PrebuiltManifest } from '../harness/prebuilt-workflows';
import { syncDataset } from '../langsmith/dataset-sync';
import type { MultiRunEvaluation, WorkflowTestCase, WorkflowTestCaseResult } from '../types';

export interface RunConfig {
	args: CliArgs;
	lanes: Lane[];
	logger: EvalLogger;
	testCasesWithFiles: WorkflowTestCaseWithFile[];
	prebuiltManifest?: PrebuiltManifest;
	/** When true, workflows built/fetched this run are deleted afterwards: prebuilt
	 *  workflows opted in via --delete-prebuilt-workflows, or throwaway workflows
	 *  built by --build-via-mcp (unless --keep-workflows). Tracked per-lane on
	 *  `lane.workflowIdsToDelete`. */
	cleanupBuiltWorkflows: boolean;
	/** Directory for per-build `claude` logs (`--build-via-mcp` only). */
	mcpBuildLogDir?: string;
	/** Per-build `claude` spend, appended by buildWorkflowViaMcpOnLane across all
	 *  lanes (`--build-via-mcp` only; stays empty otherwise). Aggregated into
	 *  LangSmith experiment metadata and eval-results.json — the run's only spend
	 *  record beyond raw session logs, for a suite that's manual-only due to cost. */
	mcpBuildSpend: McpBuildSpend[];
	/** Optional sink the direct loop pushes each completed iteration's results into
	 *  as they finish, so an abort that rejects the run still leaves the caller
	 *  (runEvalAndPersist) with the scenarios that already completed. */
	partialResults?: WorkflowTestCaseResult[][];
}

export async function runWithLangSmith(config: RunConfig): Promise<{
	evaluation: MultiRunEvaluation;
	experimentName: string;
	experimentUrl: string | undefined;
	outcome: ComparisonOutcome | undefined;
	slugByTestCase: Map<WorkflowTestCase, string>;
}> {
	const {
		args,
		lanes,
		logger,
		testCasesWithFiles,
		prebuiltManifest,
		cleanupBuiltWorkflows,
		mcpBuildLogDir,
		mcpBuildSpend,
	} = config;

	if (testCasesWithFiles.length === 0) {
		logger.info('No workflow test cases selected (check --source / --filter / --exclude / --tier)');
		return {
			evaluation: { totalRuns: 0, testCases: [] },
			experimentName: '',
			experimentUrl: undefined,
			outcome: { kind: 'no_baseline' },
			slugByTestCase: new Map(),
		};
	}

	// A dedicated dataset and baseline prefix are the two halves of cohort
	// isolation; overriding only one silently touches shared Instance AI data.
	const isolationWarning = partialIsolationWarning(args.dataset, args.baselinePrefix);
	if (isolationWarning) logger.warn(isolationWarning);

	// Pin eval writes to the eval workspace; our PAT would otherwise default to Prod.
	const workspaceId = await resolveEvalWorkspaceId();
	if (workspaceId) {
		logger.info(
			`Pinning eval experiments to LangSmith workspace "${EVAL_WORKSPACE_NAME}" (${workspaceId})`,
		);
	}
	const lsClient = new Client(workspaceId ? { workspaceId } : {});
	const datasetName = await syncDataset(lsClient, args.dataset, logger, testCasesWithFiles);

	// Shared per-run assembly (lanes → allocator → build orchestrator → case
	// pipeline). The traceable() hook around the lane functions is the only
	// LangSmith-aware piece; span names and shape are unchanged.
	const session = createEvalSession({
		args,
		lanes,
		logger,
		testCasesWithFiles,
		prebuiltManifest,
		cleanupBuiltWorkflows,
		mcpBuildLogDir,
		mcpBuildSpend,
		wrap: (name, laneNum, fn) =>
			// TraceableFunction's conditional type cannot resolve over the generic
			// hook signature; the runtime shape is exactly `fn`.
			traceable(fn, {
				name,
				run_type: 'chain',
				client: lsClient,
				metadata: { lane: laneNum },
			}) as typeof fn,
	});
	const { buildDurations } = session.orchestrator;
	const target = session.pipeline.runRow;

	const feedbackExtractor = ({ run }: { run: Run }): EvaluationResult[] => {
		const output = parseTargetOutput(run.outputs);
		if (!output) return [];
		// 'none' for passed scenarios so the column shows a full categorical
		// breakdown instead of blank cells.
		const failureCategory = output.passed ? 'none' : (output.failureCategory ?? 'unknown');
		// Verifier-incomplete runs get no scenario_pass score so LangSmith
		// experiment averages match the local evaluated-only pass rate.
		const feedback: EvaluationResult[] = [
			...(output.incomplete
				? []
				: [
						{
							key: 'scenario_pass',
							score: output.score,
							comment: output.reasoning || undefined,
						},
					]),
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
		// Deterministic conversation counter (per evals rubric) — a navigation/feature
		// signal for the HOW judges, not a gating check.
		if (output.planRejections !== undefined) {
			feedback.push({ key: 'plan_rejection_count', score: output.planRejections });
		}
		// Skip N/A so LangSmith column averages reduce to per-check pass-rate.
		if (output.workflowChecks) {
			for (const outcome of output.workflowChecks) {
				if (outcome.status === 'n_a' || outcome.status === 'error') continue;
				feedback.push({
					key: `evals.workflows.${outcome.dimension}.${outcome.name}`,
					score: outcome.status === 'pass' ? 1 : 0,
					comment: outcome.comment ?? undefined,
				});
			}
		}
		return feedback;
	};

	const experimentPrefix = args.experimentName ?? computeExperimentPrefix();

	logger.info(
		`Starting evaluate() with concurrency=${String(args.concurrency)}, ${String(lanes.length)} lane(s) × ${String(MAX_CONCURRENT_BUILDS)} concurrent builds, iterations=${String(args.iterations)}`,
	);

	// Filter the dataset to the selected slugs — the sync is additive, so orphans
	// accumulate and we only want scenarios for currently-selected cases.
	const sourceExamples = filteredExamplesIterable(
		lsClient,
		datasetName,
		testCasesWithFiles.map((tc) => tc.fileSlug),
		logger,
	);
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
				exclude: args.exclude ?? null,
				tier: args.tier ?? null,
				prebuilt: prebuiltManifest !== undefined,
				baselinePrefix: args.baselinePrefix,
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

		const sideBand = await session.resolveSideBand();
		const allRunResults = reshapeLangSmithRuns(
			experimentResults.results,
			testCasesWithFiles,
			args.iterations,
			sideBand.transcriptByThreadId,
			sideBand.buildExpectations,
			lanes[0]?.baseUrl,
			sideBand.runDebug,
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
			// Only meaningful when we drove the build via MCP; otherwise the builder
			// is the in-n8n agent and args.buildModel is unused.
			buildModel: args.buildViaMcp ? args.buildModel : undefined,
			mcpBuildSpend,
		});

		await writePerRunPassMetrics({
			lsClient,
			runs: experimentResults.results,
			logger,
		});

		// Gated tiers (e.g. `pr`) assert an absolute green bar instead of comparing
		// to a baseline — skip the comparison entirely.
		const outcome = isGatedTier(args.tier)
			? undefined
			: await tryRunComparison({
					lsClient,
					prExperimentName: experimentResults.experimentName,
					evaluation,
					testCasesWithFiles,
					baselinePrefix: args.baselinePrefix,
					logger,
				});

		// Best-effort: the report link is nice-to-have, never run-fatal.
		const experimentUrl = await lsClient
			.getProjectUrl({ projectName: experimentResults.experimentName })
			.catch(() => undefined);

		return {
			evaluation,
			experimentName: experimentResults.experimentName,
			experimentUrl,
			outcome,
			slugByTestCase: session.slugByTestCase,
		};
	} finally {
		await session.drainBuilds();
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
	slugs: string[],
	logger: EvalLogger,
): AsyncIterable<Example> {
	if (slugs.length === 0) {
		logger.info('No test cases selected — nothing to evaluate');
		return (async function* () {})();
	}
	logger.info(`Selected ${String(slugs.length)} split(s): ${slugs.join(', ')}`);
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
	/** MCP build model (only meaningful for --build-via-mcp). Recorded as
	 *  experiment metadata so LangSmith can surface/filter it as a column — the
	 *  built-in "Models" column stays empty because the external `claude` build
	 *  isn't traced as an LLM run. */
	buildModel?: string;
	/** Per-build `claude` spend (--build-via-mcp only; empty otherwise). Recorded
	 *  next to build_model so the experiment carries its own cost record — the
	 *  external build isn't traced, so LangSmith can't compute this itself. */
	mcpBuildSpend?: McpBuildSpend[];
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

	const spend = summarizeMcpBuildSpend(config.mcpBuildSpend);
	const aggregates = {
		duration_s: Math.round(totalDurationMs / 100) / 10,
		avg_build_s: Math.round(avgBuildMs / 100) / 10,
		avg_exec_s: Math.round(avgExecMs / 100) / 10,
		unique_builds: uniqueBuilds,
		pass_rate_per_iter: computePassRatePerIter(evaluation),
		...(config.buildModel ? { build_model: config.buildModel } : {}),
		...(spend ? { total_build_cost_usd: spend.totalCostUsd, avg_build_turns: spend.avgTurns } : {}),
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
		// Incomplete rows (judge/verifier dead) carry no verdict — keep them out of
		// the pass_at_k/pass_hat_k denominator, mirroring feedbackExtractor.
		if (output.incomplete) continue;
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
	baselinePrefix: string;
	logger: EvalLogger;
}): Promise<ComparisonOutcome> {
	const { lsClient, prExperimentName, evaluation, testCasesWithFiles, baselinePrefix, logger } =
		config;

	try {
		const baselineName = await findLatestBaseline(lsClient, baselinePrefix);
		if (!baselineName) {
			// Strip the trailing hyphen so the hint names the experiment, not the lookup prefix.
			const baselineExperimentName = baselinePrefix.replace(/-$/, '');
			logger.verbose(
				'No baseline experiment found — skipping comparison. ' +
					`Run with --experiment-name ${baselineExperimentName} to create one.`,
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
