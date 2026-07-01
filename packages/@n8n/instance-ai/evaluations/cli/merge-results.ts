#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Merge sharded MCP eval results (CI Phase 2).
//
// Each matrix shard runs the whole build+eval pipeline for a disjoint slice of
// the `mcp` tier and uploads its own `eval-results.json`. Because shards are
// slug-disjoint, their `testCases[]` arrays never overlap, so concatenating
// them and recomputing the headline reproduces exactly what a single-instance
// run would have written (`computeAggregateMetrics` / `computePassRatePerIter`
// in cli/index.ts, mirrored here against the JSON artifact).
//
// Output: a combined `eval-results.json` + a rendered summary written to the
// output dir (`eval-pr-comment.md`) and appended to `$GITHUB_STEP_SUMMARY`.
//
// LangSmith re-upload of one unified experiment per run is layered on top in
// `uploadUnifiedExperiment` (see --upload-experiment); the core merge here is
// pure and needs no LangSmith.
// ---------------------------------------------------------------------------

import fg from 'fast-glob';
import { jsonParse } from 'n8n-workflow';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import {
	hardRegressions,
	improvements,
	softRegressions,
	watchList,
	type ComparisonOutcome,
	type ScenarioComparison,
} from '../comparison/compare';

// ---------------------------------------------------------------------------
// Artifact schema — the subset of cli/index.ts's writeEvalResults output we
// consume. `.passthrough()` keeps us tolerant of fields we don't read (and of
// additive changes to the writer) while still validating the shape we depend on.
// ---------------------------------------------------------------------------

const buildExpectationResultSchema = z
	.object({
		expectation: z.string(),
		pass: z.boolean(),
		reason: z.string().default(''),
		incomplete: z.boolean().optional(),
	})
	.passthrough();

const scenarioRunSchema = z
	.object({
		workflowId: z.string().nullable().default(null),
		passed: z.boolean().default(false),
		score: z.number().default(0),
		reasoning: z.string().default(''),
		failureCategory: z.string().optional(),
		rootCause: z.string().optional(),
		execErrors: z.array(z.unknown()).default([]),
		evalResult: z.unknown().optional(),
	})
	.passthrough();

const scenarioSchema = z
	.object({
		name: z.string(),
		passCount: z.number(),
		totalRuns: z.number(),
		passAtK: z.number(),
		passHatK: z.number(),
		runs: z.array(scenarioRunSchema),
	})
	.passthrough();

const buildExpectationSchema = z
	.object({
		expectation: z.string(),
		passCount: z.number(),
		evaluatedCount: z.number(),
		passAtK: z.number(),
		passHatK: z.number(),
	})
	.passthrough();

const checkStatusSchema = z.enum(['pass', 'fail', 'n_a']);

const testCaseSchema = z
	.object({
		name: z.string(),
		testCaseFile: z.string().optional(),
		buildSuccessCount: z.number(),
		totalRuns: z.number(),
		workflowChecksPerRun: z.array(z.record(z.string(), checkStatusSchema).nullable()).default([]),
		buildExpectationResultsPerRun: z
			.array(z.array(buildExpectationResultSchema).nullable())
			.default([]),
		buildExpectations: z.array(buildExpectationSchema).default([]),
		threadIds: z.array(z.string().nullable()).default([]),
		scenarios: z.array(scenarioSchema).default([]),
	})
	.passthrough();

const checkCountsSchema = z
	.object({
		kind: z.enum(['deterministic', 'llm']),
		dimension: z.string(),
		passes: z.number(),
		fails: z.number(),
		nA: z.number(),
	})
	.passthrough();

const workflowChecksAggregateSchema = z
	.object({
		scoredBuilds: z.number(),
		perCheck: z.record(z.string(), checkCountsSchema),
	})
	.passthrough();

const evalResultsSchema = z
	.object({
		timestamp: z.string().optional(),
		duration: z.number().default(0),
		totalRuns: z.number(),
		experimentName: z.string().nullish(),
		summary: z
			.object({
				workflowChecks: workflowChecksAggregateSchema.optional(),
			})
			.passthrough(),
		testCases: z.array(testCaseSchema),
	})
	.passthrough();

export type EvalResults = z.infer<typeof evalResultsSchema>;
export type EvalTestCase = z.infer<typeof testCaseSchema>;
type WorkflowChecksAggregate = z.infer<typeof workflowChecksAggregateSchema>;

export interface CombinedSummary {
	testCases: number;
	built: number;
	scenariosTotal: number;
	passAtK: number;
	passHatK: number;
	passRatePerIter: string;
	workflowChecks?: WorkflowChecksAggregate;
}

export interface CombinedResults {
	totalRuns: number;
	/** Wall-clock proxy: the slowest shard (shards run in parallel). */
	durationMs: number;
	testCases: EvalTestCase[];
	summary: CombinedSummary;
}

// ---------------------------------------------------------------------------
// Combine + recompute
// ---------------------------------------------------------------------------

/**
 * Parse one shard artifact. Returns `undefined` (with a warning) for a missing
 * or malformed file so one dead shard doesn't sink the whole merge — a shard
 * can legitimately produce no results when its build/eval failed before writing.
 */
export function parseShardFile(path: string): EvalResults | undefined {
	let raw: string;
	try {
		raw = readFileSync(path, 'utf8');
	} catch {
		process.stderr.write(`  ! skipping ${path}: not readable\n`);
		return undefined;
	}
	let json: unknown;
	try {
		json = jsonParse(raw);
	} catch {
		process.stderr.write(`  ! skipping ${path}: not valid JSON\n`);
		return undefined;
	}
	const parsed = evalResultsSchema.safeParse(json);
	if (!parsed.success) {
		process.stderr.write(`  ! skipping ${path}: ${parsed.error.issues[0]?.message ?? 'invalid'}\n`);
		return undefined;
	}
	return parsed.data;
}

/** Mean over a list, or 0 when empty (matches computeAggregateMetrics). */
function mean(values: number[]): number {
	return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

/**
 * Recompute the headline from concatenated test cases. Mirrors
 * `computeAggregateMetrics` + `computePassRatePerIter` in cli/index.ts: units =
 * scenarios + build-expectations with `evaluatedCount > 0`, each already stored
 * at its terminal k in the JSON, so averaging those reproduces the headline.
 */
export function recomputeSummary(testCases: EvalTestCase[], totalRuns: number): CombinedSummary {
	const unitPassAtK: number[] = [];
	const unitPassHatK: number[] = [];
	for (const tc of testCases) {
		for (const sc of tc.scenarios) {
			unitPassAtK.push(sc.passAtK);
			unitPassHatK.push(sc.passHatK);
		}
		for (const ea of tc.buildExpectations) {
			if (ea.evaluatedCount > 0) {
				unitPassAtK.push(ea.passAtK);
				unitPassHatK.push(ea.passHatK);
			}
		}
	}

	// `workflowChecks` is set by combineShards from the per-shard summaries —
	// the raw test cases here don't carry each check's kind/dimension.
	return {
		testCases: testCases.length,
		built: testCases.filter((tc) => tc.buildSuccessCount > 0).length,
		scenariosTotal: testCases.reduce((n, tc) => n + tc.scenarios.length, 0),
		passAtK: mean(unitPassAtK),
		passHatK: mean(unitPassHatK),
		passRatePerIter: computePassRatePerIter(testCases, totalRuns),
	};
}

/** Per-iteration pass rate over units, e.g. "37% / 40% / 37%". */
function computePassRatePerIter(testCases: EvalTestCase[], totalRuns: number): string {
	const hasUnits = testCases.some(
		(tc) => tc.scenarios.length > 0 || tc.buildExpectations.some((ea) => ea.evaluatedCount > 0),
	);
	if (!hasUnits || totalRuns <= 0) return '';
	const rates: string[] = [];
	for (let i = 0; i < totalRuns; i++) {
		let passed = 0;
		let total = 0;
		for (const tc of testCases) {
			for (const sc of tc.scenarios) {
				total++;
				if (sc.runs[i]?.passed) passed++;
			}
			for (const verdict of tc.buildExpectationResultsPerRun[i] ?? []) {
				if (verdict.incomplete) continue;
				total++;
				if (verdict.pass) passed++;
			}
		}
		rates.push(`${String(total > 0 ? Math.round((passed / total) * 100) : 0)}%`);
	}
	return rates.join(' / ');
}

/** Combine parsed shard results into one report-shaped object. */
export function combineShards(shards: EvalResults[]): CombinedResults {
	if (shards.length === 0) {
		throw new Error('No shard results to merge — every shard artifact was missing or malformed.');
	}

	// All shards should share iterations; index-aligned passRatePerIter needs it.
	// Use the max and warn on disagreement rather than silently misaligning.
	const totalRunsValues = [...new Set(shards.map((s) => s.totalRuns))];
	if (totalRunsValues.length > 1) {
		process.stderr.write(
			`  ! shards disagree on totalRuns (${totalRunsValues.join(', ')}); using max — per-iteration rates are best-effort\n`,
		);
	}
	const totalRuns = Math.max(...totalRunsValues);

	const testCases = shards.flatMap((s) => s.testCases);
	const seen = new Map<string, number>();
	for (const tc of testCases) {
		const slug = tc.testCaseFile ?? tc.name;
		seen.set(slug, (seen.get(slug) ?? 0) + 1);
	}
	const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([slug]) => slug);
	if (dupes.length > 0) {
		throw new Error(
			`Overlapping slugs across shards (shards must be disjoint): ${dupes.join(', ')}`,
		);
	}

	const summary = recomputeSummary(testCases, totalRuns);
	summary.workflowChecks = combineShardWorkflowChecks(shards);

	return {
		totalRuns,
		durationMs: Math.max(0, ...shards.map((s) => s.duration)),
		testCases,
		summary,
	};
}

/** Sum each shard's `summary.workflowChecks` into one whole-tier aggregate. */
function combineShardWorkflowChecks(shards: EvalResults[]): WorkflowChecksAggregate | undefined {
	const perCheck: WorkflowChecksAggregate['perCheck'] = {};
	let scoredBuilds = 0;
	let anyScored = false;
	for (const shard of shards) {
		const wc = shard.summary.workflowChecks;
		if (!wc) continue;
		anyScored = true;
		scoredBuilds += wc.scoredBuilds;
		for (const [name, counts] of Object.entries(wc.perCheck)) {
			const entry = perCheck[name] ?? {
				kind: counts.kind,
				dimension: counts.dimension,
				passes: 0,
				fails: 0,
				nA: 0,
			};
			entry.passes += counts.passes;
			entry.fails += counts.fails;
			entry.nA += counts.nA;
			perCheck[name] = entry;
		}
	}
	return anyScored ? { scoredBuilds, perCheck } : undefined;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function pctOf(passed: number, total: number): number {
	return total > 0 ? Math.round((passed / total) * 100) : 0;
}

/** Optional context layered onto the rendered summary (coverage, experiment, comparison). */
export interface RenderContext {
	/** Discovered shard artifacts that couldn't be read/parsed. */
	malformedArtifacts?: string[];
	/** Shards the planner expected (from plan-shards); enables coverage validation. */
	expectedShards?: number;
	/** Shards that reported usable results. */
	reportedShards?: number;
	/** Whether the unified LangSmith upload was skipped due to incomplete coverage. */
	uploadSkipped?: boolean;
	experimentName?: string;
	experimentUrl?: string;
	outcome?: ComparisonOutcome;
}

/**
 * Render the combined run as markdown for `$GITHUB_STEP_SUMMARY` /
 * `eval-pr-comment.md`. Mirrors the no-comparison layout of
 * `formatComparisonMarkdown`: headline, per-test-case table, workflow checks,
 * failure details. (The baseline-comparison section is added by the LangSmith
 * upload step in Increment 2.)
 */
export function renderSummaryMarkdown(
	combined: CombinedResults,
	context: RenderContext = {},
): string {
	const { totalRuns, summary, testCases } = combined;
	const lines: string[] = [];
	lines.push('### MCP Workflow Eval (sharded)');
	lines.push('');

	lines.push(...renderCoverageWarning(context));

	lines.push(...renderComparisonAlert(context.outcome));

	const passAtKPct = Math.round(summary.passAtK * 100);
	const passHatKPct = Math.round(summary.passHatK * 100);
	lines.push(
		`**Aggregate**: pass@${totalRuns} ${passAtKPct}% · pass^${totalRuns} ${passHatKPct}% — ` +
			`${summary.built}/${summary.testCases} built · ${summary.scenariosTotal} scenarios × N=${totalRuns}`,
	);
	if (summary.passRatePerIter) {
		lines.push('');
		lines.push(`_Per-iteration pass rate: ${summary.passRatePerIter}_`);
	}
	if (context.experimentName) {
		lines.push('');
		const label = context.experimentUrl
			? `[${context.experimentName}](${context.experimentUrl})`
			: `\`${context.experimentName}\``;
		lines.push(`_Unified LangSmith experiment: ${label}_`);
	}
	lines.push('');

	lines.push(...renderRegressionTables(context.outcome));
	lines.push(...renderPerTestCaseTable(testCases, totalRuns));
	lines.push(...renderWorkflowChecks(summary.workflowChecks));
	lines.push(...renderFailureDetails(testCases));

	return lines.join('\n');
}

/**
 * Warn when the merge covered fewer shards than the planner expected (a shard
 * died before uploading, so it never appears in the glob) or when a discovered
 * artifact was malformed. Without an expected count we can only flag malformed
 * artifacts — an absent shard is then indistinguishable from "never planned".
 */
function renderCoverageWarning(context: RenderContext): string[] {
	const malformed = context.malformedArtifacts ?? [];
	const { expectedShards, reportedShards } = context;
	const missing =
		expectedShards !== undefined && reportedShards !== undefined
			? Math.max(0, expectedShards - reportedShards)
			: 0;
	if (missing === 0 && malformed.length === 0) return [];

	const lines = ['> [!WARNING]'];
	if (missing > 0) {
		lines.push(
			`> Incomplete coverage: only ${reportedShards} of ${expectedShards} shard(s) reported usable results — ${missing} did not report. Metrics below cover only the shards that reported.`,
		);
		if (malformed.length > 0) {
			lines.push(
				'>',
				`> ${malformed.length} of the discovered artifact(s) were unreadable or malformed.`,
			);
		}
		if (context.uploadSkipped) {
			lines.push(
				'>',
				'> The unified LangSmith experiment was **not uploaded**: partial coverage must not overwrite the baseline. Re-run to record a complete experiment.',
			);
		}
	} else {
		lines.push(
			`> ${malformed.length} shard artifact(s) were unreadable or malformed — results below cover the shards that reported.`,
		);
	}
	lines.push('');
	return lines;
}

/** One-line baseline-comparison verdict, mirroring format.ts's top alert. */
function renderComparisonAlert(outcome?: ComparisonOutcome): string[] {
	if (!outcome) return [];
	if (outcome.kind === 'no_baseline') {
		return [
			'> [!NOTE]',
			'> No baseline configured — comparison skipped. Dispatch with `experiment-name=mcp-baseline` to create one.',
			'',
		];
	}
	if (outcome.kind === 'self_baseline') {
		return ['> [!NOTE]', `> This run is the baseline (\`${outcome.experimentName}\`).`, ''];
	}
	if (outcome.kind === 'fetch_failed') {
		return [
			'> [!WARNING]',
			`> Regression detection did not run — baseline fetch failed: ${outcome.error}`,
			'',
		];
	}
	const r = outcome.result;
	const hard = hardRegressions(r).length;
	const soft = softRegressions(r).length;
	const watch = watchList(r).length;
	const imps = improvements(r).length;
	const delta = r.aggregate.delta * 100;
	const deltaText = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pp`;
	const icon = hard > 0 ? '🔴' : soft > 0 ? '🟡' : watch > 0 ? '🔵' : '🟢';
	const kind = hard > 0 ? 'CAUTION' : soft > 0 ? 'WARNING' : 'NOTE';
	return [
		`> [!${kind}]`,
		`> ${icon} ${hard} regression(s) · ${soft} likely · ${watch} watch · ${imps} improvement(s) · pass rate ${deltaText} vs baseline`,
		'',
	];
}

/** Regression / improvement scenario tables, only when a comparison ran. */
function renderRegressionTables(outcome?: ComparisonOutcome): string[] {
	if (!outcome || outcome.kind !== 'ok') return [];
	const r = outcome.result;
	const lines: string[] = [];
	const section = (title: string, scenarios: ScenarioComparison[]): void => {
		if (scenarios.length === 0) return;
		lines.push(`#### ${title} (${scenarios.length})`, '');
		lines.push('| Scenario | PR | Baseline | Δ |', '|---|---|---|---|');
		for (const s of scenarios) {
			const d = s.delta * 100;
			const arrow = d > 0 ? ' ↑' : d < 0 ? ' ↓' : '';
			lines.push(
				`| \`${s.testCaseFile}/${s.scenarioName}\` | ${s.prPasses}/${s.prTotal} | ${s.baselinePasses}/${s.baselineTotal} | ${d >= 0 ? '+' : ''}${d.toFixed(0)}pp${arrow} |`,
			);
		}
		lines.push('');
	};
	section('Regressions', hardRegressions(r));
	section('Likely regressions', softRegressions(r));
	section('Worth watching', watchList(r));
	section('Improvements', improvements(r));
	return lines;
}

function renderPerTestCaseTable(testCases: EvalTestCase[], totalRuns: number): string[] {
	if (testCases.length === 0) return [];
	const lines: string[] = [];
	lines.push(`<details><summary>Per-test-case results (${testCases.length})</summary>`);
	lines.push('');
	const sorted = [...testCases].sort((a, b) =>
		(a.testCaseFile ?? a.name).localeCompare(b.testCaseFile ?? b.name),
	);
	if (totalRuns > 1) {
		lines.push(`| Workflow | Built | pass@${totalRuns} | pass^${totalRuns} |`);
		lines.push('|---|---|---|---|');
		for (const tc of sorted) {
			const units = [
				...tc.scenarios.map((s) => s.passAtK),
				...tc.buildExpectations.filter((e) => e.evaluatedCount > 0).map((e) => e.passAtK),
			];
			const unitsHat = [
				...tc.scenarios.map((s) => s.passHatK),
				...tc.buildExpectations.filter((e) => e.evaluatedCount > 0).map((e) => e.passHatK),
			];
			const atK = units.length
				? Math.round((units.reduce((s, v) => s + v, 0) / units.length) * 100)
				: 0;
			const hatK = unitsHat.length
				? Math.round((unitsHat.reduce((s, v) => s + v, 0) / unitsHat.length) * 100)
				: 0;
			lines.push(
				`| \`${tc.testCaseFile ?? tc.name}\` | ${tc.buildSuccessCount}/${totalRuns} | ${atK}% | ${hatK}% |`,
			);
		}
	} else {
		lines.push('| Workflow | Built | Pass rate |');
		lines.push('|---|---|---|');
		for (const tc of sorted) {
			const built = tc.buildSuccessCount > 0 ? '✓' : '✗';
			const passed = tc.scenarios.filter((s) => s.runs[0]?.passed).length;
			lines.push(
				`| \`${tc.testCaseFile ?? tc.name}\` | ${built} | ${passed}/${tc.scenarios.length} |`,
			);
		}
	}
	lines.push('');
	lines.push('</details>');
	lines.push('');
	return lines;
}

function renderWorkflowChecks(aggregate: WorkflowChecksAggregate | undefined): string[] {
	if (!aggregate) return [];
	const names = Object.keys(aggregate.perCheck).sort();
	const failing = names.filter((n) => aggregate.perCheck[n].fails > 0);
	const row = (name: string): string => {
		const e = aggregate.perCheck[name];
		const scored = e.passes + e.fails;
		const rate = scored > 0 ? `${Math.round((e.passes / scored) * 100)}%` : '—';
		return `| \`${e.dimension}\` | \`${name}\` | ${e.kind} | ${e.passes} | ${e.fails} | ${e.nA} | ${rate} |`;
	};
	const header = [
		'| Dimension | Check | Kind | Pass | Fail | N/A | Pass rate |',
		'|---|---|---|---|---|---|---|',
	];
	const lines: string[] = ['#### Workflow checks', ''];
	lines.push(`_Scored over ${aggregate.scoredBuilds} successful build(s)._`, '');
	if (failing.length > 0) lines.push(...header, ...failing.map(row), '');
	lines.push(
		`<details><summary>All workflow checks (${failing.length} failing of ${names.length})</summary>`,
		'',
		...header,
		...names.map(row),
		'',
		'</details>',
		'',
	);
	return lines;
}

function renderFailureDetails(testCases: EvalTestCase[]): string[] {
	const lines: string[] = [];
	const failed: Array<{ slug: string; scenario: string; reasons: string[] }> = [];
	for (const tc of testCases) {
		const slug = tc.testCaseFile ?? tc.name;
		for (const sc of tc.scenarios) {
			const reasons = sc.runs
				.filter((r) => !r.passed)
				.map(
					(r) =>
						`${r.failureCategory ? `[${r.failureCategory}] ` : ''}${r.reasoning.slice(0, 200)}`,
				);
			if (reasons.length > 0) failed.push({ slug, scenario: sc.name, reasons });
		}
	}
	if (failed.length === 0) return lines;
	lines.push('<details><summary>Failure details</summary>', '');
	for (const f of failed) {
		lines.push(`**\`${f.slug}/${f.scenario}\`** — ${f.reasons.length} failed`);
		for (const r of f.reasons) lines.push(`> ${r}`);
		lines.push('');
	}
	lines.push('</details>', '');
	return lines;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface MergeArgs {
	inputDir?: string;
	inputs: string[];
	outputDir: string;
	/** Re-upload the merged results as one unified LangSmith experiment (option b). */
	uploadExperiment: boolean;
	dataset: string;
	baselinePrefix: string;
	experimentName?: string;
	/** Shards the planner expected; lets the merge detect a shard that never reported. */
	expectedShards?: number;
}

function parseArgs(argv: string[]): MergeArgs {
	const result: MergeArgs = {
		inputs: [],
		outputDir: process.cwd(),
		uploadExperiment: false,
		dataset: 'mcp-workflow-evals',
		baselinePrefix: 'mcp-baseline-',
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case '--input-dir':
				result.inputDir = nextArg(argv, i, '--input-dir');
				i++;
				break;
			case '--output-dir':
				result.outputDir = nextArg(argv, i, '--output-dir');
				i++;
				break;
			case '--upload-experiment':
				result.uploadExperiment = true;
				break;
			case '--dataset':
				result.dataset = nextArg(argv, i, '--dataset');
				i++;
				break;
			case '--baseline-prefix': {
				const raw = nextArg(argv, i, '--baseline-prefix');
				result.baselinePrefix = raw.endsWith('-') ? raw : `${raw}-`;
				i++;
				break;
			}
			case '--experiment-name':
				result.experimentName = nextArg(argv, i, '--experiment-name');
				i++;
				break;
			case '--expected-shards': {
				const parsed = Number.parseInt(nextArg(argv, i, '--expected-shards'), 10);
				if (!Number.isInteger(parsed) || parsed < 1) {
					throw new Error('--expected-shards must be a positive integer');
				}
				result.expectedShards = parsed;
				i++;
				break;
			}
			default:
				if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg.split('=', 1)[0]}`);
				result.inputs.push(arg);
		}
	}
	return result;
}

function nextArg(argv: string[], currentIndex: number, flagName: string): string {
	const value = argv[currentIndex + 1];
	if (value === undefined || value.startsWith('--')) {
		throw new Error(`Missing value for ${flagName}`);
	}
	return value;
}

/** Resolve the shard `eval-results.json` paths from positional args + --input-dir. */
export function resolveInputPaths(args: MergeArgs): string[] {
	const paths = [...args.inputs];
	if (args.inputDir) {
		paths.push(
			...fg.sync('**/eval-results.json', { cwd: args.inputDir, absolute: true, dot: false }),
		);
	}
	return [...new Set(paths)].sort();
}

/**
 * Coverage is complete when every planned shard reported a usable result. With
 * no expected count (e.g. a local merge with no planner) we can't detect an
 * absent shard, so we optimistically treat coverage as complete.
 */
export function isCoverageComplete(reportedShards: number, expectedShards?: number): boolean {
	return expectedShards === undefined || reportedShards >= expectedShards;
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const paths = resolveInputPaths(args);
	if (paths.length === 0) {
		throw new Error('No eval-results.json inputs found (pass paths or --input-dir).');
	}
	process.stderr.write(`Merging ${paths.length} shard artifact(s):\n`);

	const shards: EvalResults[] = [];
	const malformedArtifacts: string[] = [];
	for (const path of paths) {
		const parsed = parseShardFile(path);
		if (parsed) shards.push(parsed);
		else malformedArtifacts.push(path);
	}
	if (shards.length === 0) {
		throw new Error('No usable shard results — every artifact was missing or malformed.');
	}

	const combined = combineShards(shards);

	// Validate coverage against the planner's expected shard count. A shard that
	// died before uploading its artifact never appears in the glob, so without
	// this the merge would silently report — and upload — partial coverage.
	const reportedShards = shards.length;
	const coverageComplete = isCoverageComplete(reportedShards, args.expectedShards);
	const missingShardCount =
		args.expectedShards !== undefined ? Math.max(0, args.expectedShards - reportedShards) : 0;

	// Option b: re-upload one unified experiment so LangSmith keeps a single
	// experiment per run for run-over-run comparison. Best-effort — a LangSmith
	// outage must not sink the merge, whose core value is the combined summary.
	let experimentName: string | undefined;
	let experimentUrl: string | undefined;
	let outcome: ComparisonOutcome | undefined;
	let comparisonStatus: ComparisonOutcome['kind'] | 'not_attempted' = 'not_attempted';
	let uploadSkipped = false;
	if (args.uploadExperiment) {
		if (!coverageComplete) {
			// Skip rather than record a partial experiment: a partial baseline
			// refresh would silently corrupt every future run-over-run comparison.
			uploadSkipped = true;
			process.stderr.write(
				`  ! incomplete coverage (${reportedShards}/${String(args.expectedShards)} shards reported) — skipping unified LangSmith upload\n`,
			);
		} else if (!process.env.LANGSMITH_API_KEY) {
			process.stderr.write(
				'  ! --upload-experiment set but LANGSMITH_API_KEY is missing — skipping upload\n',
			);
		} else {
			try {
				const { uploadUnifiedExperiment } = await import('./upload-merged-experiment');
				const result = await uploadUnifiedExperiment({
					combined,
					dataset: args.dataset,
					baselinePrefix: args.baselinePrefix,
					experimentName: args.experimentName,
					shardCount: shards.length,
				});
				experimentName = result.experimentName;
				experimentUrl = result.experimentUrl;
				outcome = result.outcome;
				comparisonStatus = result.outcome.kind;
			} catch (error: unknown) {
				process.stderr.write(
					`  ! unified experiment upload failed (continuing with local summary): ${error instanceof Error ? error.message : String(error)}\n`,
				);
			}
		}
	}

	const markdown = renderSummaryMarkdown(combined, {
		malformedArtifacts,
		expectedShards: args.expectedShards,
		reportedShards,
		uploadSkipped,
		experimentName,
		experimentUrl,
		outcome,
	});

	mkdirSync(args.outputDir, { recursive: true });
	const report = {
		timestamp: new Date().toISOString(),
		duration: combined.durationMs,
		totalRuns: combined.totalRuns,
		experimentName,
		experimentUrl,
		summary: combined.summary,
		comparison:
			outcome?.kind === 'ok'
				? { baseline: outcome.result.baseline.experimentName, result: outcome.result }
				: undefined,
		comparisonStatus,
		merged: {
			shardCount: reportedShards,
			expectedShardCount: args.expectedShards ?? null,
			missingShardCount,
			malformedArtifacts,
			uploadSkipped,
		},
		testCases: combined.testCases,
	};
	const jsonPath = join(args.outputDir, 'eval-results.json');
	writeFileSync(jsonPath, JSON.stringify(report, null, 2));
	const mdPath = join(args.outputDir, 'eval-pr-comment.md');
	writeFileSync(mdPath, markdown);
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
	}

	process.stderr.write(`Merged ${combined.testCases.length} test case(s) → ${jsonPath}\n`);
	process.stdout.write(`${markdown}\n`);
}

if (process.argv[1] && /merge-results\.ts$/.test(process.argv[1])) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
