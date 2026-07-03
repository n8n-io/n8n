// ---------------------------------------------------------------------------
// Absolute "all-green" gate for curated tiers (e.g. `pr`).
//
// Unlike the baseline comparison (compare.ts), this needs no baseline: the
// gated tier is curated so every measured unit is expected to pass, so any
// unit that isn't green is a candidate regression. Pure function over
// MultiRunEvaluation — no I/O, no LangSmith — so it's unit-testable and runs
// in both LangSmith and direct modes.
//
// A "unit" is an execution scenario or an evaluated build expectation (the
// same units the pass rate is computed over). Always-failing scenarios are
// deleted from the curated tier rather than flagged; build expectations with
// no verdict (evaluatedCount 0) are excluded automatically since there's
// nothing to judge.
// ---------------------------------------------------------------------------

import type { MultiRunEvaluation, WorkflowTestCase } from '../types';

// Tiers whose runs assert an absolute green bar instead of comparing to a
// baseline. Keep this the single source of truth for "is this a gated run".
export const GATED_TIERS = new Set(['pr']);

export function isGatedTier(tier?: string): boolean {
	return tier !== undefined && GATED_TIERS.has(tier);
}

export type GateCriterion =
	// Every unit passes at least once across the k iterations (pass@k = 100%).
	// Tolerant of single-iteration LLM/mock flakiness; flags units that break
	// entirely. Recommended default.
	| { kind: 'passAtK' }
	// Pooled trial pass rate across all gated units ≥ minRate (the "average
	// pass rate" the comment already shows).
	| { kind: 'minAggregatePassRate'; minRate: number };

export const DEFAULT_GATE_CRITERION: GateCriterion = { kind: 'passAtK' };

export interface GateUnit {
	slug: string;
	kind: 'scenario' | 'buildExpectation';
	passCount: number;
	/** Denominator: iterations for scenarios, evaluated (non-incomplete) runs for build expectations. */
	total: number;
	passRate: number;
	green: boolean;
	/** Failure-category tally across failed runs (scenarios only). */
	failureCategories?: Record<string, number>;
}

export interface GateResult {
	criterion: GateCriterion;
	/** Iterations the run used (k). */
	totalRuns: number;
	/** Overall verdict over gated (non-excluded) units. */
	green: boolean;
	/** Gated units (those that count toward the verdict). */
	units: GateUnit[];
	/** Gated units that aren't green. */
	failing: GateUnit[];
	/** Units kept out of the verdict (opted out via `gate: false`, or no judge verdict) — surfaced for visibility. */
	excluded: GateUnit[];
	/** Pooled trial pass rate over gated units. */
	aggregate: { passed: number; total: number; rate: number };
}

interface EvaluateGateOptions {
	criterion?: GateCriterion;
	/** Maps each test case to its file slug for unit labels (matches the comparison labels). */
	slugByTestCase?: Map<WorkflowTestCase, string>;
}

/** Per-unit greenness for criteria that judge units individually. */
function unitGreen(passCount: number, total: number, criterion: GateCriterion): boolean {
	if (total === 0) return false;
	switch (criterion.kind) {
		case 'passAtK':
			return passCount >= 1;
		case 'minAggregatePassRate':
			// Per-unit greenness is display-only here; the verdict is aggregate. Use
			// the same "at least one pass" notion so a fully-failing unit still
			// renders red in the failing list.
			return passCount >= 1;
	}
}

export function evaluateGate(
	evaluation: MultiRunEvaluation,
	options: EvaluateGateOptions = {},
): GateResult {
	const criterion = options.criterion ?? DEFAULT_GATE_CRITERION;
	const slugByTestCase = options.slugByTestCase;

	const gated: GateUnit[] = [];
	const excluded: GateUnit[] = [];

	for (const tc of evaluation.testCases) {
		const fileSlug = slugByTestCase?.get(tc.testCase);
		const prefix = fileSlug ?? 'unknown';

		for (const sa of tc.executionScenarios) {
			const total = sa.runs.length;
			const failureCategories: Record<string, number> = {};
			for (const r of sa.runs) {
				if (!r.success) {
					const cat = r.failureCategory ?? 'uncategorized';
					failureCategories[cat] = (failureCategories[cat] ?? 0) + 1;
				}
			}
			const unit: GateUnit = {
				slug: `${prefix}/${sa.scenario.name}`,
				kind: 'scenario',
				passCount: sa.passCount,
				total,
				passRate: total > 0 ? sa.passCount / total : 0,
				green: unitGreen(sa.passCount, total, criterion),
				...(Object.keys(failureCategories).length > 0 ? { failureCategories } : {}),
			};
			gated.push(unit);
		}

		for (const ea of tc.buildExpectations) {
			const total = ea.evaluatedCount;
			const unit: GateUnit = {
				slug: `${prefix} :: ${ea.expectation.slice(0, 60)}`,
				kind: 'buildExpectation',
				passCount: ea.passCount,
				total,
				passRate: total > 0 ? ea.passCount / total : 0,
				green: unitGreen(ea.passCount, total, criterion),
			};
			// No verdict in any run → nothing to gate on; surface for visibility.
			if (total === 0) excluded.push(unit);
			else gated.push(unit);
		}
	}

	const passed = gated.reduce((sum, u) => sum + u.passCount, 0);
	const total = gated.reduce((sum, u) => sum + u.total, 0);
	const aggregate = { passed, total, rate: total > 0 ? passed / total : 0 };

	const failing = gated.filter((u) => !u.green);
	const green =
		criterion.kind === 'minAggregatePassRate'
			? gated.length > 0 && aggregate.rate >= criterion.minRate
			: failing.length === 0;

	return {
		criterion,
		totalRuns: evaluation.totalRuns,
		green,
		units: gated,
		failing,
		excluded,
		aggregate,
	};
}
