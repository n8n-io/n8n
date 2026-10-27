// ---------------------------------------------------------------------------
// Decides whether one scenario's pass rate is meaningfully worse than
// another, at the small sample sizes evals run at (N=3 typically).
//
// Public surface:
//   - classifyScenario(prPasses, prTotal, basePasses, baseTotal) — the verdict
//   - wilsonInterval(passes, total) — confidence band for a pass rate, used
//     for the headline aggregate
//
// The implementation uses Fisher's exact test and the Wilson score interval
// under the hood; both are standard small-sample statistics. You don't need
// to know either to use the public API.
// ---------------------------------------------------------------------------
import { strict as assert } from 'node:assert';

// ---------------------------------------------------------------------------
// Fisher's exact test (one-sided)
//
// Given a 2×2 table of pass/fail counts for PR vs baseline, returns the
// probability of seeing a gap at least as bad as the observed one if the two
// groups actually had the same pass rate. Small return value ⇒ strong
// evidence the PR is worse.
// ---------------------------------------------------------------------------

const logFactorialCache: number[] = [0, 0];

function logFactorial(n: number): number {
	for (let i = logFactorialCache.length; i <= n; i++) {
		logFactorialCache.push(logFactorialCache[i - 1] + Math.log(i));
	}
	return logFactorialCache[n];
}

function logBinomial(n: number, k: number): number {
	if (k < 0 || k > n) return -Infinity;
	return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

function hypergeomPmf(nPasses: number, nFails: number, nDrawn: number, k: number): number {
	const total = nPasses + nFails;
	if (k < Math.max(0, nDrawn - nFails) || k > Math.min(nDrawn, nPasses)) return 0;
	return Math.exp(
		logBinomial(nPasses, k) + logBinomial(nFails, nDrawn - k) - logBinomial(total, nDrawn),
	);
}

/**
 * One-sided Fisher's exact test (left tail). Returns the probability that
 * PR's pass count would be at most `a` if PR and baseline shared the same
 * underlying pass rate. Small value ⇒ PR is significantly worse.
 *
 * 2×2 table:
 *
 *              passed   failed
 *   PR        |   a    |   b   |
 *   Baseline  |   c    |   d   |
 *
 * Returns 1 (no information) when either side has no trials, or when all
 * trials passed or all failed.
 */
export function fishersExactOneSidedLeft(a: number, b: number, c: number, d: number): number {
	const inputs = [a, b, c, d];
	for (const v of inputs) {
		assert(
			Number.isInteger(v) && v >= 0,
			'fishersExactOneSidedLeft requires non-negative integers',
		);
	}

	const nPr = a + b;
	const nBase = c + d;
	const nPasses = a + c;
	const nFails = b + d;

	if (nPr === 0 || nBase === 0) return 1;
	if (nPasses === 0 || nFails === 0) return 1;

	let pValue = 0;
	const kMax = Math.min(a, nPasses);
	for (let k = 0; k <= kMax; k++) {
		pValue += hypergeomPmf(nPasses, nFails, nPr, k);
	}
	// Clamp to [0, 1] — accumulated FP error can push the sum slightly past 1.
	return Math.min(1, Math.max(0, pValue));
}

// ---------------------------------------------------------------------------
// Wilson score interval (95% confidence)
//
// Returns a confidence band for a pass rate that behaves well at small N and
// at extreme rates (close to 0 or 1) — both common in our evals. Used for
// the headline aggregate band only; classification doesn't need it.
// ---------------------------------------------------------------------------

// Standard z-score for a 95% confidence interval. We only ever use 95%, so
// the value is inlined rather than parameterised.
const Z_95 = 1.96;

export function wilsonInterval(passes: number, total: number): { lower: number; upper: number } {
	assert(
		Number.isInteger(passes) && passes >= 0,
		'wilsonInterval: passes must be a non-negative integer',
	);
	assert(
		Number.isInteger(total) && total >= 0,
		'wilsonInterval: total must be a non-negative integer',
	);
	assert(passes <= total, 'wilsonInterval: passes cannot exceed total');

	if (total === 0) return { lower: 0, upper: 1 };

	const p = passes / total;
	const z2 = Z_95 * Z_95;
	const denom = 1 + z2 / total;
	const center = (p + z2 / (2 * total)) / denom;
	const halfWidth = (Z_95 * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denom;
	return {
		lower: Math.max(0, center - halfWidth),
		upper: Math.min(1, center + halfWidth),
	};
}

// ---------------------------------------------------------------------------
// Per-scenario classification
//
// Three flag tiers, evaluated in order of strictness:
//
//   hard_regression  — high-confidence drop on a reliable baseline.
//                      Gating-grade.
//   soft_regression  — looser bar; investigate, not gating.
//   watch            — moved noticeably but didn't pass either flag tier.
//                      Pure visibility.
//
// Improvements use the hard tier (we don't surface borderline improvements;
// they tend to be noise in the positive direction).
// ---------------------------------------------------------------------------

export type ScenarioVerdict =
	| 'hard_regression' // PR is confidently worse, baseline was reliable
	| 'soft_regression' // looser bar — worth investigating, not high-confidence
	| 'watch' // moved enough to surface but no flag tier triggered
	| 'improvement' // PR is significantly better
	| 'stable' // no meaningful change
	| 'unreliable_baseline' // confident drop but baseline was too flaky to trust
	| 'insufficient_data'; // either side had zero trials

export interface ScenarioClassification {
	verdict: ScenarioVerdict;
	/** PR pass rate (0..1) */
	prPassRate: number;
	/** Baseline pass rate (0..1) */
	baselinePassRate: number;
	/** PR rate − baseline rate, signed. Negative = PR worse. */
	delta: number;
	/** Probability the PR is at least this much worse by chance. Lower ⇒ stronger regression evidence. */
	pValueLeft: number;
	/** Probability the PR is at least this much better by chance. */
	pValueRight: number;
}

export interface TierThresholds {
	/** Flag only when the chance the gap happened by noise is below this. */
	maxPValue: number;
	/** Flag only when the absolute pass-rate gap is at least this large (0..1). */
	minDelta: number;
	/** Flag only when the baseline pass rate was at least this high (0..1). */
	minBaselinePassRate: number;
}

export interface ClassifyOptions {
	/** Hard-flag thresholds (most strict). Defaults: maxPValue=0.05, minDelta=0.30, minBaselinePassRate=0.70. */
	hard?: Partial<TierThresholds>;
	/** Soft-flag thresholds (looser). Defaults: maxPValue=0.20, minDelta=0.15, minBaselinePassRate=0.50. */
	soft?: Partial<TierThresholds>;
	/** Absolute pass-rate change required for a "watch" verdict regardless of significance. Default 0.35. */
	watchDelta?: number;
}

const DEFAULT_HARD: TierThresholds = {
	maxPValue: 0.05,
	minDelta: 0.3,
	minBaselinePassRate: 0.7,
};
const DEFAULT_SOFT: TierThresholds = {
	maxPValue: 0.2,
	minDelta: 0.15,
	minBaselinePassRate: 0.5,
};
// Watch threshold: surface scenarios whose pass rate changed by at least 35pp
// without reaching a flag tier. High enough that natural noise on rock-solid
// scenarios (e.g. 2/3 vs 10/10 = −33pp) doesn't crowd the comment.
const DEFAULT_WATCH_DELTA = 0.35;

function meetsThreshold(
	pValue: number,
	delta: number,
	baselineRate: number,
	tier: TierThresholds,
	direction: 'worse' | 'better',
): boolean {
	if (pValue >= tier.maxPValue) return false;
	if (direction === 'worse') {
		if (delta > -tier.minDelta) return false;
		if (baselineRate < tier.minBaselinePassRate) return false;
	} else {
		if (delta < tier.minDelta) return false;
		// Improvements skip the reliability gate — fixing flaky scenarios is a real win.
	}
	return true;
}

/**
 * Classify a single scenario into one of seven verdicts. See ScenarioVerdict
 * for the tier semantics.
 *
 * `options` exists for tests; production callers leave thresholds at defaults.
 */
export function classifyScenario(
	prPasses: number,
	prTotal: number,
	baselinePasses: number,
	baselineTotal: number,
	options: ClassifyOptions = {},
): ScenarioClassification {
	const hard: TierThresholds = { ...DEFAULT_HARD, ...options.hard };
	const soft: TierThresholds = { ...DEFAULT_SOFT, ...options.soft };
	const watchDelta = options.watchDelta ?? DEFAULT_WATCH_DELTA;

	const prPassRate = prTotal > 0 ? prPasses / prTotal : 0;
	const baselinePassRate = baselineTotal > 0 ? baselinePasses / baselineTotal : 0;

	if (prTotal === 0 || baselineTotal === 0) {
		return {
			verdict: 'insufficient_data',
			prPassRate,
			baselinePassRate,
			delta: prPassRate - baselinePassRate,
			pValueLeft: 1,
			pValueRight: 1,
		};
	}

	const a = prPasses;
	const b = prTotal - prPasses;
	const c = baselinePasses;
	const d = baselineTotal - baselinePasses;

	const pValueLeft = fishersExactOneSidedLeft(a, b, c, d);
	const pValueRight = fishersExactOneSidedLeft(c, d, a, b);
	const delta = prPassRate - baselinePassRate;

	// Improvement (right tail) — single tier, hard thresholds only
	if (meetsThreshold(pValueRight, delta, baselinePassRate, hard, 'better')) {
		return { verdict: 'improvement', prPassRate, baselinePassRate, delta, pValueLeft, pValueRight };
	}

	// Hard regression — passes all three hard gates
	if (meetsThreshold(pValueLeft, delta, baselinePassRate, hard, 'worse')) {
		return {
			verdict: 'hard_regression',
			prPassRate,
			baselinePassRate,
			delta,
			pValueLeft,
			pValueRight,
		};
	}

	// Confident drop, but on a baseline too flaky to call a regression.
	// Surface as `unreliable_baseline` so it's visible without being a flag.
	if (
		pValueLeft < hard.maxPValue &&
		delta <= -hard.minDelta &&
		baselinePassRate < hard.minBaselinePassRate
	) {
		return {
			verdict: 'unreliable_baseline',
			prPassRate,
			baselinePassRate,
			delta,
			pValueLeft,
			pValueRight,
		};
	}

	// Soft regression — passes the looser gates
	if (meetsThreshold(pValueLeft, delta, baselinePassRate, soft, 'worse')) {
		return {
			verdict: 'soft_regression',
			prPassRate,
			baselinePassRate,
			delta,
			pValueLeft,
			pValueRight,
		};
	}

	// Watch — meaningful movement but no flag fired. Pure visibility.
	if (Math.abs(delta) >= watchDelta) {
		return { verdict: 'watch', prPassRate, baselinePassRate, delta, pValueLeft, pValueRight };
	}

	return { verdict: 'stable', prPassRate, baselinePassRate, delta, pValueLeft, pValueRight };
}
