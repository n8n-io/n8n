// ---------------------------------------------------------------------------
// Re-upload the merged shard results as ONE LangSmith experiment. Sharding
// splits a run across N processes, and LangSmith makes each evaluate() call its
// own experiment — so without this, a sharded run scatters into N experiments
// and you lose the single-experiment, run-over-run history.
//
// We replay the already-computed per-(slug, scenario, iteration) outcomes
// through the SAME evaluate() path a real run uses (a target that just returns
// the precomputed output). The resulting experiment is byte-comparable to a
// single-instance run: its root runs carry inputs {testCaseFile, scenarioName}
// and outputs {passed, failureCategory}, exactly what fetchBaselineBucket reads
// and what the LangSmith UI groups by. We then run the normal baseline
// comparison against it.
// ---------------------------------------------------------------------------

import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import type { EvaluationResult } from 'langsmith/evaluation';
import type { Example } from 'langsmith/schemas';

import { buildCIMetadata, computeExperimentPrefix } from '../ci-metadata';
import type { CombinedResults, EvalTestCase } from './merge-results';
import {
	compareBuckets,
	type ComparisonOutcome,
	type ExperimentBucket,
	type ScenarioCounts,
} from '../../comparison/compare';
import { fetchBaselineBucket, findLatestBaseline } from '../../comparison/fetch-baseline';
import { loadWorkflowTestCasesBySlugs } from '../../data/workflows';
import { createLogger } from '../../harness/logger';
import { syncDataset } from '../../langsmith/dataset-sync';

interface ReplayInputs {
	testCaseFile?: string;
	scenarioName?: string;
	_iteration?: number;
}

/** Precomputed per-(slug, scenario, iteration) output replayed into the experiment. */
interface ReplayOutput {
	buildSuccess: boolean;
	passed: boolean;
	score: number;
	reasoning: string;
	failureCategory?: string;
	workflowId?: string;
	execErrors: string[];
	/**
	 * Scenario-level pass@k / pass^k, stamped onto every run of the scenario. The
	 * direct eval path attaches these per-run post-hoc (writePerRunPassMetrics in
	 * cli/index.ts); the merged JSON already carries the computed values, so the
	 * replay emits them directly and LangSmith's column average reduces to the
	 * mean across scenarios — matching the non-sharded experiment.
	 */
	passAtK: number;
	passHatK: number;
}

/** Index the merged test cases by `${slug}/${scenario}/${iteration}` for O(1) replay. */
export function buildReplayMap(testCases: EvalTestCase[]): Map<string, ReplayOutput> {
	const map = new Map<string, ReplayOutput>();
	for (const tc of testCases) {
		const slug = tc.testCaseFile ?? tc.name;
		for (const sc of tc.scenarios) {
			sc.runs.forEach((run, i) => {
				map.set(`${slug}/${sc.name}/${String(i)}`, {
					buildSuccess: run.workflowId !== null,
					passed: run.passed,
					score: run.score,
					reasoning: run.reasoning,
					failureCategory: run.passed ? undefined : run.failureCategory,
					workflowId: run.workflowId ?? undefined,
					execErrors: [],
					passAtK: sc.passAtK,
					passHatK: sc.passHatK,
				});
			});
		}
	}
	return map;
}

/**
 * Project the merged results onto the bucket shape `compareBuckets` consumes,
 * keyed by `${slug}/${scenarioName}` — mirrors `bucketFromEvaluation` in
 * cli/index.ts but sourced from the merged JSON.
 */
export function bucketFromCombined(
	combined: CombinedResults,
	experimentName: string,
): ExperimentBucket {
	const scenarios = new Map<string, ScenarioCounts>();
	const failureCategoryTotals: Record<string, number> = {};
	let trialTotal = 0;
	for (const tc of combined.testCases) {
		const slug = tc.testCaseFile ?? tc.name;
		for (const sc of tc.scenarios) {
			const failureCategories: Record<string, number> = {};
			for (const run of sc.runs) {
				trialTotal++;
				if (!run.passed && run.failureCategory) {
					failureCategories[run.failureCategory] =
						(failureCategories[run.failureCategory] ?? 0) + 1;
					failureCategoryTotals[run.failureCategory] =
						(failureCategoryTotals[run.failureCategory] ?? 0) + 1;
				}
			}
			scenarios.set(`${slug}/${sc.name}`, {
				testCaseFile: slug,
				scenarioName: sc.name,
				passed: sc.passCount,
				total: sc.runs.length,
				failureCategories,
			});
		}
	}
	return { experimentName, scenarios, failureCategoryTotals, trialTotal };
}

/** Collect the example stream and expand into N per-iteration copies (tagging `_iteration`). */
async function expandExamples(
	source: AsyncIterable<Example>,
	iterations: number,
): Promise<Example[]> {
	const cached: Example[] = [];
	for await (const ex of source) cached.push(ex);
	const expanded: Example[] = [];
	for (let i = 0; i < Math.max(1, iterations); i++) {
		for (const ex of cached) {
			expanded.push({ ...ex, inputs: { ...ex.inputs, _iteration: i } });
		}
	}
	return expanded;
}

async function runComparison(
	client: Client,
	experimentName: string,
	combined: CombinedResults,
	baselinePrefix: string,
): Promise<ComparisonOutcome> {
	try {
		const baselineName = await findLatestBaseline(client, baselinePrefix);
		if (!baselineName) return { kind: 'no_baseline' };
		if (baselineName === experimentName)
			return { kind: 'self_baseline', experimentName: baselineName };
		const baseline = await fetchBaselineBucket(client, baselineName);
		const pr = bucketFromCombined(combined, experimentName);
		return { kind: 'ok', result: compareBuckets(pr, baseline) };
	} catch (error: unknown) {
		return { kind: 'fetch_failed', error: error instanceof Error ? error.message : String(error) };
	}
}

export interface UploadOptions {
	combined: CombinedResults;
	/** LangSmith dataset to record under (must match the shards' dataset). */
	dataset: string;
	/** Baseline lookup prefix (e.g. `mcp-baseline-`). */
	baselinePrefix: string;
	/** Explicit experiment name; omit to auto-derive from CI/git context. */
	experimentName?: string;
	/** Number of shards that contributed — recorded in experiment metadata. */
	shardCount?: number;
	verbose?: boolean;
}

/**
 * Create one unified LangSmith experiment from the merged results and compare it
 * to the latest baseline. Returns the experiment name + comparison outcome.
 * Throws only on hard LangSmith failures (caller decides whether to continue).
 */
export async function uploadUnifiedExperiment(
	opts: UploadOptions,
): Promise<{ experimentName: string; experimentUrl?: string; outcome: ComparisonOutcome }> {
	const logger = createLogger(opts.verbose ?? false);
	const client = new Client();
	const slugs = [...new Set(opts.combined.testCases.map((tc) => tc.testCaseFile ?? tc.name))];

	// Ensure the dataset + examples exist for every merged slug (idempotent), so
	// the replay runs link to real dataset examples. Select by EXACT slug — a
	// substring filter here would sync unrelated cases (e.g. `weather-alert` also
	// matching `weather-alert-no-prebuild-setup-question`) into the dataset.
	const testCasesWithFiles = loadWorkflowTestCasesBySlugs(slugs);
	if (testCasesWithFiles.length < slugs.length) {
		const found = new Set(testCasesWithFiles.map((tc) => tc.fileSlug));
		const missing = slugs.filter((slug) => !found.has(slug));
		// A merged slug with no case file won't get a dataset example, so its runs
		// can't be replayed. Shouldn't happen at a fixed ref (the shards built it),
		// so surface it rather than dropping the slug silently.
		logger.warn(`No test-case file for merged slug(s): ${missing.join(', ')}`);
	}
	const datasetName = await syncDataset(client, opts.dataset, logger, testCasesWithFiles);

	const replay = buildReplayMap(opts.combined.testCases);
	const data = await expandExamples(
		client.listExamples({ datasetName, splits: slugs }),
		opts.combined.totalRuns,
	);

	// Plain target (no traceable wrapper): evaluate() creates the root run per
	// example and records this return value as its outputs — exactly the
	// {testCaseFile, scenarioName} inputs + {passed, failureCategory} outputs that
	// fetchBaselineBucket reads back. Mirrors the eval CLI's target.
	const target = (inputs: ReplayInputs): ReplayOutput => {
		const key = `${inputs.testCaseFile}/${inputs.scenarioName}/${String(inputs._iteration ?? 0)}`;
		return (
			replay.get(key) ?? {
				buildSuccess: false,
				passed: false,
				score: 0,
				reasoning: 'No merged result for this scenario/iteration.',
				failureCategory: 'framework_issue',
				execErrors: [],
				passAtK: 0,
				passHatK: 0,
			}
		);
	};

	const feedbackExtractor = ({
		run,
	}: {
		run: { outputs?: Record<string, unknown> | null };
	}): EvaluationResult[] => {
		const out = run.outputs;
		if (!out) return [];
		const passed = out.passed === true;
		const score = typeof out.score === 'number' ? out.score : passed ? 1 : 0;
		const failureCategory = passed
			? 'none'
			: typeof out.failureCategory === 'string'
				? out.failureCategory
				: 'unknown';
		const feedback: EvaluationResult[] = [
			{ key: 'scenario_pass', score },
			{ key: 'failure_category', value: failureCategory },
		];
		// Scenario-level pass@k / pass^k are precomputed in the merged JSON and
		// stamped onto every run (see ReplayOutput) so these columns populate the
		// same way the direct eval path does.
		if (typeof out.passAtK === 'number') feedback.push({ key: 'pass_at_k', score: out.passAtK });
		if (typeof out.passHatK === 'number') {
			feedback.push({ key: 'pass_hat_k', score: out.passHatK });
		}
		return feedback;
	};

	const experimentResults = await evaluate(target, {
		data,
		evaluators: [feedbackExtractor],
		experimentPrefix: opts.experimentName ?? computeExperimentPrefix(),
		maxConcurrency: 16,
		client,
		metadata: {
			merged: true,
			shards: opts.shardCount ?? null,
			tier: 'mcp',
			iterations: opts.combined.totalRuns,
			// Mirror the direct eval path's metadata so the experiments table shows
			// the same baselinePrefix column for sharded runs.
			baselinePrefix: opts.baselinePrefix,
			...buildCIMetadata(),
		},
	});
	logger.info(`Unified experiment: ${experimentResults.experimentName}`);
	await client.awaitPendingTraceBatches();

	// Best-effort deep link to the experiment (o/<tenant>/projects/p/<id>).
	// Never fail the merge over a URL lookup.
	let experimentUrl: string | undefined;
	try {
		experimentUrl = await client.getProjectUrl({ projectName: experimentResults.experimentName });
	} catch (error: unknown) {
		logger.verbose(
			`Could not resolve experiment URL: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	const outcome = await runComparison(
		client,
		experimentResults.experimentName,
		opts.combined,
		opts.baselinePrefix,
	);
	return { experimentName: experimentResults.experimentName, experimentUrl, outcome };
}
