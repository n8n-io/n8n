// ---------------------------------------------------------------------------
// Persistence — the always-write guarantee around a run (TRUST-261). Owns the
// eval-results.json / eval-pr-comment.md assembly (the cross-repo contract the
// LangTracer dispatcher ingests), the aggregate pass metrics, and the
// crash path that still writes whatever completed when the run threw.
// ---------------------------------------------------------------------------

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { aggregateResults } from './aggregator';
import type { McpBuildSpend } from './build-orchestrator';
import { parseTargetOutput, reshapeLangSmithRuns, type ReshapeRunRow } from './reshape';
import { roundRobinCaseRows } from './rows';
import { aggregateWorkflowChecks, statusMap } from '../binaryChecks/aggregate';
import type { CliArgs } from '../cli/args';
import type { ComparisonOutcome, ComparisonResult } from '../comparison/compare';
import { formatComparisonMarkdown, type RerunHint } from '../comparison/format';
import { evaluateGate, isGatedTier, type GateResult } from '../comparison/gate';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import type { EvalLogger } from '../harness/logger';
import { extractErrorMessage } from '../harness/transient-error';
import { rollupCaseVerification } from '../summary';
import type {
	BuildExpectationResult,
	MultiRunEvaluation,
	WorkflowTestCase,
	WorkflowTestCaseResult,
} from '../types';
import { caseDisplayPrompt } from '../utils/conversation-text';

/**
 * Sum per-build `claude` spend into run-level numbers, or undefined when no
 * MCP builds were recorded (so non-MCP runs add nothing to their outputs).
 * Each entry already sums every attempt of its build (see McpBuildSpend), so
 * the totals are the run's true spend.
 */
export function summarizeMcpBuildSpend(
	spend: McpBuildSpend[] | undefined,
): { builds: number; totalCostUsd: number; avgTurns: number } | undefined {
	if (!spend || spend.length === 0) return undefined;
	const totalCost = spend.reduce((sum, s) => sum + s.costUsd, 0);
	const totalTurns = spend.reduce((sum, s) => sum + s.turns, 0);
	return {
		builds: spend.length,
		totalCostUsd: Math.round(totalCost * 100) / 100,
		avgTurns: Math.round((totalTurns / spend.length) * 10) / 10,
	};
}

interface AggregateMetrics {
	/** Number of test cases with at least one successful build across iterations. */
	built: number;
	/** Total scenarios across all test cases. */
	scenariosTotal: number;
	/** Mean pass@k across units (scenarios + evaluated expectations), each at its terminal k (0..1). */
	passAtK: number;
	/** Mean pass^k across units (scenarios + evaluated expectations), each at its terminal k (0..1). */
	passHatK: number;
	/** Pass rate of each iteration formatted as e.g. "37% / 37% / 37%". */
	passRatePerIter: string;
}

/** Terminal pass@k/pass^k for a unit = its last evaluated k (totalRuns for scenarios, evaluatedCount for expectations). */
function terminalRate(arr: number[]): number {
	return arr[arr.length - 1] ?? 0;
}

function computeAggregateMetrics(evaluation: MultiRunEvaluation): AggregateMetrics {
	const { testCases } = evaluation;
	// Units = scenarios + evaluated build-expectations — mirrors the per-card badge and the
	// terminal per-case table so the headline rate can't disagree with them.
	const units = testCases.flatMap((tc) => [
		...tc.executionScenarios.filter((sa) => sa.evaluatedCount > 0),
		...tc.buildExpectations.filter((ea) => ea.evaluatedCount > 0),
	]);
	const total = units.length;
	const scenariosTotal = testCases.reduce((n, tc) => n + tc.executionScenarios.length, 0);
	const built = testCases.filter((tc) => tc.buildSuccessCount > 0).length;
	const passAtK =
		total > 0 ? units.reduce((sum, u) => sum + terminalRate(u.passAtK), 0) / total : 0;
	const passHatK =
		total > 0 ? units.reduce((sum, u) => sum + terminalRate(u.passHatK), 0) / total : 0;
	return {
		built,
		scenariosTotal,
		passAtK,
		passHatK,
		passRatePerIter: computePassRatePerIter(evaluation),
	};
}

/** Pass rate of each iteration (over units = scenarios + evaluated expectations). */
export function computePassRatePerIter(evaluation: MultiRunEvaluation): string {
	const { totalRuns, testCases } = evaluation;
	const hasUnits = testCases.some(
		(tc) =>
			tc.executionScenarios.length > 0 || tc.buildExpectations.some((ea) => ea.evaluatedCount > 0),
	);
	if (!hasUnits) return '';
	const rates: string[] = [];
	for (let i = 0; i < totalRuns; i++) {
		let passed = 0;
		let total = 0;
		for (const tc of testCases) {
			for (const sa of tc.executionScenarios) {
				const runResult = sa.runs[i];
				if (runResult?.incomplete) continue;
				total++;
				if (runResult?.success) passed++;
			}
			// Count each scored verdict in this iteration directly — skips incomplete
			// (build-failed) verdicts and is robust to duplicate expectation strings.
			for (const verdict of tc.runs[i]?.buildExpectationResults ?? []) {
				if (verdict.incomplete) continue;
				total++;
				if (verdict.pass) passed++;
			}
		}
		rates.push(total > 0 ? `${String(Math.round((passed / total) * 100))}%` : 'n/a');
	}
	return rates.join(' / ');
}

// Re-run hint for the PR comment: a self-seeded dispatch against the PR head.
// Undefined outside CI or when not associated with a PR (EVAL_PR_NUMBER unset).
export function ciRerunHint(): RerunHint | undefined {
	const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, EVAL_PR_NUMBER } = process.env;
	if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY || !EVAL_PR_NUMBER) return undefined;
	return {
		prNumber: EVAL_PR_NUMBER,
		dispatchUrl: `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/workflows/ci-instance-ai-evals.yml`,
	};
}

/** What `runEval` produces on success — the aggregation plus the LangSmith-only
 *  comparison metadata (undefined in direct-loop mode). */

// ---------------------------------------------------------------------------
// Row sink — crash recovery
// ---------------------------------------------------------------------------

/** Journals one JSON line per completed row so a run that dies mid-flight
 *  (budget abort, lane meltdown, OOM) still leaves recoverable verdicts.
 *  Both drivers feed it; `runEvalAndPersist` reads it back on the crash path. */
export interface RowSink {
	path: string;
	append: (row: ReshapeRunRow) => void;
	readRows: () => ReshapeRunRow[];
}

export function createRowSink(outputDir: string | undefined): RowSink {
	const dir = outputDir ?? process.cwd();
	mkdirSync(dir, { recursive: true });
	const path = join(dir, 'eval-rows.jsonl');
	// Truncate any previous run's file so recovery never mixes runs.
	writeFileSync(path, '');
	return {
		path,
		append(row) {
			try {
				appendFileSync(path, `${JSON.stringify(row)}\n`);
			} catch {
				// The sink must never fail a row.
			}
		},
		readRows() {
			try {
				return readFileSync(path, 'utf8')
					.split('\n')
					.filter(Boolean)
					.flatMap((line) => {
						try {
							return [JSON.parse(line) as ReshapeRunRow];
						} catch {
							return []; // torn final line from a hard crash
						}
					});
			} catch {
				return [];
			}
		},
	};
}

/** Reshape sink rows back into per-iteration results, keeping only COMPLETE
 *  iterations (every expected row present) — the retired direct loop's
 *  guarantee that persisted iterations are whole and index-aligned, so
 *  never-run scenarios are not misreported as failures in a crash artifact. */
function recoverCompleteIterations(
	sinkRows: ReshapeRunRow[],
	testCasesWithFiles: WorkflowTestCaseWithFile[],
): WorkflowTestCaseResult[][] {
	const rowsPerIteration = roundRobinCaseRows(testCasesWithFiles).length;
	if (rowsPerIteration === 0) return [];
	const byIteration = new Map<number, ReshapeRunRow[]>();
	for (const row of sinkRows) {
		const inputs = row.run.inputs as { _iteration?: number } | undefined;
		const iteration = inputs?._iteration ?? 0;
		const group = byIteration.get(iteration) ?? [];
		group.push(row);
		byIteration.set(iteration, group);
	}
	const complete = [...byIteration.entries()]
		.filter(([, rows]) => rows.length === rowsPerIteration)
		.sort(([a], [b]) => a - b);
	if (complete.length === 0) return [];
	// Renumber to dense iterations so reshape doesn't stub the gaps.
	const renumbered = complete.flatMap(([, rows], denseIndex) =>
		rows.map((row) => ({
			run: {
				inputs: { ...(row.run.inputs ?? {}), _iteration: denseIndex },
				outputs: row.run.outputs,
			},
		})),
	);
	// Rebuild the judge-verdict side band from the verdicts each row embeds —
	// reshape reads only this map (the in-memory one died with the run), and
	// without it recovered rows would lose their expectation units.
	const buildExpectationsByKey = new Map<string, BuildExpectationResult[]>();
	for (const row of renumbered) {
		const inputs = row.run.inputs as { _iteration?: number; testCaseFile?: string };
		const output = parseTargetOutput(row.run.outputs);
		if (!inputs.testCaseFile || !output?.expectationResults?.length) continue;
		const key = `${String(inputs._iteration ?? 0)}:${inputs.testCaseFile}`;
		if (!buildExpectationsByKey.has(key))
			buildExpectationsByKey.set(key, output.expectationResults);
	}
	return reshapeLangSmithRuns(
		renumbered,
		testCasesWithFiles,
		complete.length,
		new Map(),
		buildExpectationsByKey,
		undefined,
		new Map(),
	);
}

export interface EvalRunOutput {
	evaluation: MultiRunEvaluation;
	experimentName?: string;
	experimentUrl?: string;
	outcome?: ComparisonOutcome;
	slugByTestCase?: Map<WorkflowTestCase, string>;
}

export interface PersistEvalConfig {
	logger: EvalLogger;
	outputDir: string | undefined;
	startTime: number;
	iterations: number;
	tier: CliArgs['tier'];
	commitSha: string | undefined;
	rerun: RerunHint | undefined;
	mcpBuildSpend: McpBuildSpend[];
	/** Journal of completed rows; read back to recover a crashed run. */
	rowSink?: RowSink;
	/** Needed to reshape recovered sink rows on the crash path. */
	testCasesWithFiles?: WorkflowTestCaseWithFile[];
}

export interface PersistedEval extends EvalRunOutput {
	gate: GateResult | undefined;
	jsonPath: string;
	prCommentPath: string;
}

/**
 * Run the eval via `runEval` and ALWAYS persist eval-results.json +
 * eval-pr-comment.md. On success returns the aggregation + write metadata so the
 * caller can render the HTML report / terminal summary.
 *
 * If `runEval` throws — a per-iteration budget/timeout abort, a lane meltdown, an
 * OOM — whatever it pushed into `partialResults` before throwing is aggregated
 * and written before the error is re-thrown. Aggregation already tolerates
 * missing/incomplete entries, so the scenarios that already completed survive
 * instead of the dispatcher finding no file and discarding the entire run.
 */
export async function runEvalAndPersist(
	config: PersistEvalConfig,
	runEval: (partialResults: WorkflowTestCaseResult[][]) => Promise<EvalRunOutput>,
): Promise<PersistedEval> {
	const partialResults: WorkflowTestCaseResult[][] = [];
	let persisted = false;
	try {
		const out = await runEval(partialResults);
		// Gated tiers report an absolute green verdict in place of the baseline comparison.
		const gate = isGatedTier(config.tier)
			? evaluateGate(out.evaluation, { slugByTestCase: out.slugByTestCase })
			: undefined;
		const { jsonPath, prCommentPath } = writeEvalResults(
			out.evaluation,
			Date.now() - config.startTime,
			config.outputDir,
			out.experimentName,
			out.outcome,
			config.commitSha,
			out.slugByTestCase,
			config.rerun,
			gate,
			config.mcpBuildSpend,
			out.experimentUrl,
		);
		persisted = true;
		return { ...out, gate, jsonPath, prCommentPath };
	} finally {
		if (!persisted) {
			try {
				// Prefer sink recovery — row-granular and fed by BOTH drivers; fall
				// back to the direct driver's per-iteration channel.
				const sinkRows = config.rowSink?.readRows() ?? [];
				const recovered =
					sinkRows.length > 0 && config.testCasesWithFiles
						? recoverCompleteIterations(sinkRows, config.testCasesWithFiles)
						: [];
				const runResults = recovered.length > 0 ? recovered : partialResults;
				const evaluation: MultiRunEvaluation =
					runResults.length > 0
						? aggregateResults(runResults, runResults.length)
						: { totalRuns: config.iterations, testCases: [] };
				const recoverySlugByTestCase = config.testCasesWithFiles
					? new Map(config.testCasesWithFiles.map(({ testCase, fileSlug }) => [testCase, fileSlug]))
					: undefined;
				const { jsonPath } = writeEvalResults(
					evaluation,
					Date.now() - config.startTime,
					config.outputDir,
					undefined,
					undefined,
					config.commitSha,
					recoverySlugByTestCase,
					config.rerun,
					undefined,
					config.mcpBuildSpend,
					undefined,
				);
				config.logger.error(
					`Eval run did not finish cleanly — wrote partial results (${String(runResults.length)} iteration(s)) to ${jsonPath}`,
				);
			} catch (writeError: unknown) {
				config.logger.error(
					`Failed to write partial eval results: ${extractErrorMessage(writeError)}`,
				);
			}
		}
	}
}

export function writeEvalResults(
	evaluation: MultiRunEvaluation,
	duration: number,
	outputDir: string | undefined,
	experimentName: string | undefined,
	outcome: ComparisonOutcome | undefined,
	commitSha: string | undefined,
	slugByTestCase: Map<WorkflowTestCase, string> | undefined,
	rerun: RerunHint | undefined,
	gate: GateResult | undefined,
	mcpBuildSpend?: McpBuildSpend[],
	experimentUrl?: string,
): { jsonPath: string; prCommentPath: string } {
	const { totalRuns, testCases } = evaluation;
	const metrics = computeAggregateMetrics(evaluation);
	const verification = rollupCaseVerification(testCases);

	const result = outcome?.kind === 'ok' ? outcome.result : undefined;

	const checksSummary = aggregateWorkflowChecks(evaluation);
	// `claude` build spend (--build-via-mcp only) — keeps a cost record in the
	// artifact even when LangSmith isn't configured.
	const buildSpendSummary = summarizeMcpBuildSpend(mcpBuildSpend);

	const report = {
		timestamp: new Date().toISOString(),
		duration,
		totalRuns,
		experimentName,
		experimentUrl,
		summary: {
			testCases: testCases.length,
			built: metrics.built,
			scenariosTotal: metrics.scenariosTotal,
			passAtK: metrics.passAtK,
			passHatK: metrics.passHatK,
			passRatePerIter: metrics.passRatePerIter,
			// Cases where nothing could be scored (all units incomplete / skipped) —
			// reported apart from the pass rate, never as a silent pass.
			notVerified: verification.notVerified,
			...(checksSummary ? { workflowChecks: checksSummary } : {}),
			...(buildSpendSummary ? { mcpBuild: buildSpendSummary } : {}),
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
		// Absolute green-gate verdict for curated tiers (undefined for baseline-compared runs).
		gate,
		testCases: testCases.map((tc) => ({
			name: caseDisplayPrompt(tc.testCase, tc.runs[0]?.transcript).slice(0, 70),
			testCaseFile: slugByTestCase?.get(tc.testCase),
			// `notVerified` when no scenario or expectation was scored across runs —
			// consumers must not treat a zero pass rate here as a pass.
			status: tc.status,
			buildSuccessCount: tc.buildSuccessCount,
			// First iteration's produced workflow — the LangTracer dispatcher renders
			// it (its Dockerfile used to sed-inject this exact field; keep the
			// expression verbatim so that patch detects upstream support and no-ops).
			workflowJson: tc.runs[0]?.workflowJson,
			totalRuns,
			workflowChecksPerRun: tc.runs.map((run) =>
				run.workflowChecks ? statusMap(run.workflowChecks) : null,
			),
			buildExpectationResultsPerRun: tc.runs.map((run) => run.buildExpectationResults ?? null),
			buildExpectations: tc.buildExpectations.map((ea) => ({
				expectation: ea.expectation,
				passCount: ea.passCount,
				evaluatedCount: ea.evaluatedCount,
				passAtK: terminalRate(ea.passAtK),
				passHatK: terminalRate(ea.passHatK),
			})),
			threadIds: tc.runs.map((run) => run.threadId ?? null),
			// `claude` build spend per iteration (--build-via-mcp only) — the
			// dedupe-safe source for per-case cost (LangSmith feedback repeats the
			// value on every row of a case's build).
			...(tc.runs.some((run) => run.buildCostUsd !== undefined)
				? {
						buildCostUsdPerRun: tc.runs.map((run) => run.buildCostUsd ?? null),
						buildTurnsPerRun: tc.runs.map((run) => run.buildTurns ?? null),
					}
				: {}),
			scenarios: tc.executionScenarios.map((sa) => ({
				name: sa.scenario.name,
				passCount: sa.passCount,
				evaluatedCount: sa.evaluatedCount,
				totalRuns,
				passAtK: terminalRate(sa.passAtK),
				passHatK: terminalRate(sa.passHatK),
				runs: sa.runs.map((sr, runIndex) => ({
					workflowId: sr.workflowId ?? tc.runs[runIndex]?.workflowId ?? null,
					...((sr.agentId ?? tc.runs[runIndex]?.agentId)
						? { agentId: sr.agentId ?? tc.runs[runIndex]?.agentId }
						: {}),
					passed: sr.success,
					...(sr.incomplete ? { incomplete: true } : {}),
					score: sr.score,
					reasoning: sr.reasoning,
					failureCategory: sr.failureCategory,
					rootCause: sr.rootCause,
					execErrors: sr.evalResult?.errors ?? sr.agentEvalResult?.errors ?? [],
					evalResult: sr.evalResult,
					...(sr.agentEvalResult ? { agentEvalResult: sr.agentEvalResult } : {}),
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
		formatComparisonMarkdown(evaluation, outcome, {
			commitSha,
			slugByTestCase,
			rerun,
			gate,
			passMetrics: { passAtK: metrics.passAtK, passHatK: metrics.passHatK },
			experimentUrl,
		}),
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
	evaluationUnits: ComparisonResult['evaluationUnits'];
	prOnly: ComparisonResult['prOnly'];
	baselineOnly: ComparisonResult['baselineOnly'];
	failureCategories: ComparisonResult['failureCategories'];
} {
	return {
		pr: result.pr,
		baseline: result.baseline,
		aggregate: result.aggregate,
		evaluationUnits: result.evaluationUnits,
		prOnly: result.prOnly,
		baselineOnly: result.baselineOnly,
		failureCategories: result.failureCategories,
	};
}
