// ---------------------------------------------------------------------------
// Comparison core: take two experiment buckets, return a ComparisonResult.
//
// A comparable "unit" is an execution scenario or an evaluated build
// expectation — both carry (passed, total) counts and get the same
// statistical treatment. Failure-category drift stays scenario-only:
// expectation verdicts carry no failure category.
//
// Pure function, no I/O. The tier thresholds (p-value cutoff, minimum delta,
// minimum baseline pass rate) live in statistics.ts — there's no CLI knob.
// Tune them there if the false-positive rate drifts.
// ---------------------------------------------------------------------------

import {
	classifyScenario,
	wilsonInterval,
	type ClassifyOptions,
	type ScenarioClassification,
	type ScenarioVerdict,
} from './statistics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EvaluationUnitKind = 'scenario' | 'expectation';

export interface EvaluationUnitCounts {
	kind: EvaluationUnitKind;
	testCaseFile: string;
	/** Scenario name, or the full expectation text for expectation units. */
	name: string;
	passed: number;
	total: number;
	failureCategories?: Record<string, number>;
}

export interface ExperimentBucket {
	experimentName: string;
	evaluationUnits: Map<string, EvaluationUnitCounts>;
	/**
	 * Aggregated failure-category counts across all *scenario* trials.
	 * Used for the run-level failure-category drift table — orthogonal to
	 * per-unit verdicts; expectation units never contribute here.
	 */
	failureCategoryTotals?: Record<string, number>;
	/** Scenario trials only — the denominator for failure-category rates. */
	trialTotal?: number;
}

/** Bucket key for a scenario unit. */
export function scenarioUnitKey(testCaseFile: string, scenarioName: string): string {
	return `${testCaseFile}/${scenarioName}`;
}

/** Bucket key for an expectation unit. The `#expectation:` infix cannot occur
 *  in a `${fileSlug}/${scenarioName}` key, so the two kinds can't collide. */
export function expectationUnitKey(testCaseFile: string, expectation: string): string {
	return `${testCaseFile}#expectation:${expectation}`;
}

export function unitKeyOf(unit: {
	kind: EvaluationUnitKind;
	testCaseFile: string;
	name: string;
}): string {
	return unit.kind === 'scenario'
		? scenarioUnitKey(unit.testCaseFile, unit.name)
		: expectationUnitKey(unit.testCaseFile, unit.name);
}

export interface EvaluationUnitComparison extends ScenarioClassification {
	kind: EvaluationUnitKind;
	testCaseFile: string;
	name: string;
	prPasses: number;
	prTotal: number;
	baselinePasses: number;
	baselineTotal: number;
}

export interface UnitRef {
	kind: EvaluationUnitKind;
	testCaseFile: string;
	name: string;
}

export interface AggregateComparison {
	intersectionSize: number;
	prAggregatePassRate: number;
	baselineAggregatePassRate: number;
	prAggregateCI: { lower: number; upper: number };
	baselineAggregateCI: { lower: number; upper: number };
	delta: number;
}

export interface FailureCategoryComparison {
	category: string;
	prCount: number;
	prRate: number; // count / trialTotal
	baselineCount: number;
	baselineRate: number;
	delta: number; // prRate − baselineRate
	notable: boolean;
}

export interface ComparisonResult {
	pr: { experimentName: string };
	baseline: { experimentName: string };
	aggregate: AggregateComparison;
	evaluationUnits: EvaluationUnitComparison[];
	prOnly: UnitRef[];
	baselineOnly: UnitRef[];
	failureCategories: FailureCategoryComparison[];
}

/**
 * Result of a comparison attempt. The `kind` field distinguishes between
 * "ran successfully", "skipped intentionally" (no baseline yet, current run
 * IS the baseline), and "failed unexpectedly" (LangSmith API error, fetch
 * timeout, etc.). The PR comment renders a different alert per kind so
 * readers can tell a missing baseline from a regression-detection outage.
 */
export type ComparisonOutcome =
	| { kind: 'ok'; result: ComparisonResult }
	| { kind: 'no_baseline' }
	| { kind: 'self_baseline'; experimentName: string }
	| { kind: 'fetch_failed'; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Hard regressions only — high-confidence, gating-grade flags. */
export function hardRegressions(result: ComparisonResult): EvaluationUnitComparison[] {
	return result.evaluationUnits.filter((s) => s.verdict === 'hard_regression');
}

/** Soft regressions — looser thresholds, worth investigating but not gating. */
export function softRegressions(result: ComparisonResult): EvaluationUnitComparison[] {
	return result.evaluationUnits.filter((s) => s.verdict === 'soft_regression');
}

/** Movement ≥ watchDelta without reaching a flag tier. Visibility only. */
export function watchList(result: ComparisonResult): EvaluationUnitComparison[] {
	return result.evaluationUnits.filter((s) => s.verdict === 'watch');
}

export function improvements(result: ComparisonResult): EvaluationUnitComparison[] {
	return result.evaluationUnits.filter((s) => s.verdict === 'improvement');
}

export function byVerdict(result: ComparisonResult): Record<ScenarioVerdict, number> {
	const counts: Record<ScenarioVerdict, number> = {
		hard_regression: 0,
		soft_regression: 0,
		watch: 0,
		improvement: 0,
		stable: 0,
		unreliable_baseline: 0,
		insufficient_data: 0,
	};
	for (const s of result.evaluationUnits) counts[s.verdict]++;
	return counts;
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

/**
 * Compare two experiment buckets and produce a structured comparison result.
 *
 * Aggregate is computed over the *intersection* of units — the only units
 * for which the rates are directly comparable. PR-only and baseline-only
 * units are surfaced separately, not folded into the aggregate (a baseline
 * captured before expectation persistence simply contributes no expectation
 * units, so those degrade to prOnly).
 *
 * Aggregate pass rate is the *micro* average — total passes / total trials
 * across the intersection.
 *
 * `options` exists for tests; production callers pass nothing.
 */
export function compareBuckets(
	pr: ExperimentBucket,
	baseline: ExperimentBucket,
	options: ClassifyOptions = {},
): ComparisonResult {
	const evaluationUnits: EvaluationUnitComparison[] = [];
	const prOnly: UnitRef[] = [];
	const baselineOnly: UnitRef[] = [];

	let prIPasses = 0;
	let prITotal = 0;
	let baseIPasses = 0;
	let baseITotal = 0;

	for (const [key, prCounts] of pr.evaluationUnits) {
		const baseCounts = baseline.evaluationUnits.get(key);
		if (!baseCounts) {
			prOnly.push({
				kind: prCounts.kind,
				testCaseFile: prCounts.testCaseFile,
				name: prCounts.name,
			});
			continue;
		}

		prIPasses += prCounts.passed;
		prITotal += prCounts.total;
		baseIPasses += baseCounts.passed;
		baseITotal += baseCounts.total;

		const classification = classifyScenario(
			prCounts.passed,
			prCounts.total,
			baseCounts.passed,
			baseCounts.total,
			options,
		);
		evaluationUnits.push({
			kind: prCounts.kind,
			testCaseFile: prCounts.testCaseFile,
			name: prCounts.name,
			prPasses: prCounts.passed,
			prTotal: prCounts.total,
			baselinePasses: baseCounts.passed,
			baselineTotal: baseCounts.total,
			...classification,
		});
	}

	for (const [key, baseCounts] of baseline.evaluationUnits) {
		if (!pr.evaluationUnits.has(key)) {
			baselineOnly.push({
				kind: baseCounts.kind,
				testCaseFile: baseCounts.testCaseFile,
				name: baseCounts.name,
			});
		}
	}

	const aggregate: AggregateComparison = {
		intersectionSize: evaluationUnits.length,
		prAggregatePassRate: rate(prIPasses, prITotal),
		baselineAggregatePassRate: rate(baseIPasses, baseITotal),
		prAggregateCI: wilsonInterval(prIPasses, prITotal),
		baselineAggregateCI: wilsonInterval(baseIPasses, baseITotal),
		delta: rate(prIPasses, prITotal) - rate(baseIPasses, baseITotal),
	};

	evaluationUnits.sort(unitComparator);

	const failureCategories = compareFailureCategories(pr, baseline);

	return {
		pr: { experimentName: pr.experimentName },
		baseline: { experimentName: baseline.experimentName },
		aggregate,
		evaluationUnits,
		prOnly,
		baselineOnly,
		failureCategories,
	};
}

// ---------------------------------------------------------------------------
// Failure-category drift
// ---------------------------------------------------------------------------

/** Min absolute rate gap to consider a category notable (5 percentage points). */
const CATEGORY_NOTABLE_RATE_DELTA = 0.05;
/** Min absolute trial-count gap (over scaling) required alongside the rate gap. */
const CATEGORY_NOTABLE_COUNT_DELTA = 3;

/**
 * Categories the verifier is supposed to emit. Anything else (malformed
 * strings like `-`, `>builder_issue`, empty, etc.) is dropped from the
 * comparison so the PR comment doesn't display verifier noise. Keep in sync
 * with the verifier's category enum; unknown values are logged at verbose
 * level via the console (see compareFailureCategories).
 */
const KNOWN_FAILURE_CATEGORIES = new Set([
	'builder_issue',
	'mock_issue',
	'framework_issue',
	'verification_failure',
	'build_failure',
]);

function isCategoryNotable(
	prCount: number,
	prTotal: number,
	baselineCount: number,
	baselineTotal: number,
): boolean {
	const rateGap = Math.abs(prCount / prTotal - baselineCount / baselineTotal);
	if (rateGap < CATEGORY_NOTABLE_RATE_DELTA) return false;
	const expectedPrCount = baselineCount * (prTotal / baselineTotal);
	const countGap = Math.abs(prCount - expectedPrCount);
	return countGap >= CATEGORY_NOTABLE_COUNT_DELTA;
}

function compareFailureCategories(
	pr: ExperimentBucket,
	baseline: ExperimentBucket,
): FailureCategoryComparison[] {
	if (!pr.failureCategoryTotals || !baseline.failureCategoryTotals) return [];
	const prTotal = pr.trialTotal ?? 0;
	const baseTotal = baseline.trialTotal ?? 0;
	if (prTotal === 0 || baseTotal === 0) return [];

	// Surface unrecognised values so we notice when the verifier adds a new
	// category (or starts emitting noise we should clean up). Doesn't enter
	// the comparison output; the renderer only knows about KNOWN_FAILURE_CATEGORIES.
	for (const category of Object.keys(pr.failureCategoryTotals)) {
		if (!KNOWN_FAILURE_CATEGORIES.has(category)) {
			console.warn(`[comparison] dropping unknown failureCategory "${category}"`);
		}
	}
	for (const category of Object.keys(baseline.failureCategoryTotals)) {
		if (!KNOWN_FAILURE_CATEGORIES.has(category)) {
			console.warn(`[comparison] dropping unknown failureCategory "${category}"`);
		}
	}

	// Always emit a row for every known category, even if both sides are 0.
	// The renderer can decide whether to suppress 0/0 rows; this gives readers
	// a complete picture of the failure-type taxonomy by default.
	const out: FailureCategoryComparison[] = [];
	for (const category of KNOWN_FAILURE_CATEGORIES) {
		const prCount = pr.failureCategoryTotals[category] ?? 0;
		const baselineCount = baseline.failureCategoryTotals[category] ?? 0;
		out.push({
			category,
			prCount,
			prRate: prCount / prTotal,
			baselineCount,
			baselineRate: baselineCount / baseTotal,
			delta: prCount / prTotal - baselineCount / baseTotal,
			notable: isCategoryNotable(prCount, prTotal, baselineCount, baseTotal),
		});
	}

	// Sort: notable first, then by absolute delta descending.
	out.sort((a, b) => {
		if (a.notable !== b.notable) return a.notable ? -1 : 1;
		return Math.abs(b.delta) - Math.abs(a.delta);
	});
	return out;
}

function rate(passes: number, total: number): number {
	return total > 0 ? passes / total : 0;
}

const VERDICT_ORDER: Record<EvaluationUnitComparison['verdict'], number> = {
	hard_regression: 0,
	soft_regression: 1,
	improvement: 2,
	watch: 3,
	unreliable_baseline: 4,
	stable: 5,
	insufficient_data: 6,
};

function unitComparator(a: EvaluationUnitComparison, b: EvaluationUnitComparison): number {
	const av = VERDICT_ORDER[a.verdict];
	const bv = VERDICT_ORDER[b.verdict];
	if (av !== bv) return av - bv;
	const fileCmp = a.testCaseFile.localeCompare(b.testCaseFile);
	if (fileCmp !== 0) return fileCmp;
	if (a.kind !== b.kind) return a.kind === 'scenario' ? -1 : 1;
	return a.name.localeCompare(b.name);
}
