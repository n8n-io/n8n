/** Pure aggregations for the views. Per-build counts and medians come from summary.json as is. */
import type { Arm, BuildTotals, FirstBuild, IterationSummary, MetricKey } from './schema';

export interface FirstBuildSummary {
	builds: number;
	firstOk: number;
	oneShot: number;
	callsToFirstSave: number | null;
	rebuilds: number | null;
	verifies: number | null;
	/** Builds with at least one counted scenario run. */
	withScenarios: number;
	firstTryCorrect: number;
	oneShotScenPass: number;
	oneShotScenN: number;
	scenPass: number;
	scenN: number;
}

const mean = (values: number[]) =>
	values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
const count = <T>(items: T[], test: (item: T) => boolean) => items.filter(test).length;
const passes = (builds: FirstBuild[]) =>
	builds.reduce((total, build) => total + count(build.scenarioPasses, Boolean), 0);
const runs = (builds: FirstBuild[]) =>
	builds.reduce((total, build) => total + build.scenarioPasses.length, 0);

/** Same definitions as summary() in firstbuild.py. */
export function summarizeFirstBuilds(builds: FirstBuild[]): FirstBuildSummary {
	const withScenarios = builds.filter((build) => build.scenarioPasses.length > 0);
	const oneShotWithScenarios = withScenarios.filter((build) => build.oneShot);
	return {
		builds: builds.length,
		firstOk: count(builds, (build) => build.firstOk),
		oneShot: count(builds, (build) => build.oneShot),
		callsToFirstSave: mean(builds.flatMap((build) => build.callsToFirstSave ?? [])),
		rebuilds: mean(builds.map((build) => build.rebuilds)),
		verifies: mean(builds.map((build) => build.verifies)),
		withScenarios: withScenarios.length,
		firstTryCorrect: count(
			withScenarios,
			(build) => build.oneShot && build.scenarioPasses.every(Boolean),
		),
		oneShotScenPass: passes(oneShotWithScenarios),
		oneShotScenN: runs(oneShotWithScenarios),
		scenPass: passes(withScenarios),
		scenN: runs(withScenarios),
	};
}

export const iterationsOfArm = (arm: Arm): IterationSummary[] =>
	arm.cases.flatMap((armCase) => armCase.iterations);

export const caseNamesOf = (arms: Arm[]): string[] =>
	[...new Set(arms.flatMap((arm) => arm.cases.map((armCase) => armCase.name)))].sort();

export const armCase = (arm: Arm, caseName: string) =>
	arm.cases.find((entry) => entry.name === caseName);

/** The case of the first arm that ran it, for its title, prompt and tags. */
export const caseOf = (arms: Arm[], caseName: string) =>
	arms.map((arm) => armCase(arm, caseName)).find((entry) => entry !== undefined);

/**
 * True when the build saved a workflow and every check (scenario runs and build expectations)
 * passed; null for an unknown verdict.
 */
export function iterationPassed(iteration: IterationSummary): boolean | null {
	if (iteration.built === false || iteration.buildError) return false;
	const checks = [
		...iteration.scenarios.map((run) => run.passed),
		...iteration.expectations.map((entry) => entry.pass),
	];
	if (checks.length === 0) return iteration.built;
	return checks.every(Boolean);
}

interface CheckResult {
	key: string;
	label: string;
	pass: boolean;
	reason: string | null;
}

/** The scenario runs and build expectations of an attempt as one list of checks. */
const checksOf = (iteration: IterationSummary): CheckResult[] => [
	...iteration.scenarios.map((run) => ({
		key: `scenario:${run.slug}`,
		label: run.title,
		pass: run.passed,
		reason: run.rootCause ?? run.reasoning,
	})),
	...iteration.expectations.map((entry) => ({
		key: `expectation:${entry.expectation}`,
		label: entry.expectation,
		pass: entry.pass,
		reason: entry.reason,
	})),
];

export const failedChecks = (iteration: IterationSummary) =>
	checksOf(iteration)
		.filter((check) => !check.pass)
		.map(({ label, reason }) => ({ label, reason }));

const median = (values: number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	if (sorted.length === 0) return null;
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * The attempt closest to the median cost and time of the candidates: the passing attempts, or
 * all attempts when `passingOnly` is false. Each distance is relative to its median, so cost and
 * time weigh the same.
 */
export function typicalBuild(
	iterations: IterationSummary[],
	{ excludeId, passingOnly }: { excludeId?: string; passingOnly: boolean },
): IterationSummary | undefined {
	const candidates = iterations.filter(
		(iteration) =>
			iteration.id !== excludeId && (!passingOnly || iterationPassed(iteration) === true),
	);
	const cost = median(candidates.flatMap((iteration) => iteration.metrics?.cost ?? []));
	const time = median(candidates.flatMap((iteration) => iteration.metrics?.wallSeconds ?? []));
	const gap = (value: number | null | undefined, middle: number | null) =>
		value === null || value === undefined || middle === null
			? Infinity
			: Math.abs(value - middle) / (middle || 1);
	const distance = (iteration: IterationSummary) =>
		gap(iteration.metrics?.cost, cost) + gap(iteration.metrics?.wallSeconds, time);
	return candidates.reduce<IterationSummary | undefined>(
		(best, iteration) => (!best || distance(iteration) < distance(best) ? iteration : best),
		undefined,
	);
}

export const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);

/** Mean per build, from summary.json sums. */
export function meanPerBuild(totals: BuildTotals, key: MetricKey): number | null {
	const sum = totals.sum[key];
	return sum === null || totals.builds === 0 ? null : sum / totals.builds;
}

export type Direction = 'better' | 'worse' | 'same' | null;

/** A cost or time change below this share of the baseline is noise at eval sample sizes. */
export const RELATIVE_NOISE = 0.1;

export interface Trend {
	direction: Direction;
	arrow: 'arrow-up' | 'arrow-down' | null;
}

/**
 * A value against the baseline: better or worse, and which way it moved. A change smaller than
 * `minChange` counts as the same. The colour says better or worse; the arrow says up or down.
 */
export function trend(
	base: number | null,
	value: number | null,
	higherIsBetter: boolean | null,
	minChange = 0,
): Trend {
	if (base === null || value === null) return { direction: null, arrow: null };
	const delta = value - base;
	if (Math.abs(delta) < Math.max(minChange - 1e-9, 1e-9)) return { direction: 'same', arrow: null };
	return {
		direction: higherIsBetter === null ? null : delta > 0 === higherIsBetter ? 'better' : 'worse',
		arrow: delta > 0 ? 'arrow-up' : 'arrow-down',
	};
}

/** The noise floor of a pass rate: one attempt of the larger sample. */
export const rateNoise = (baseAttempts: number, attempts: number) =>
	1 / Math.max(baseAttempts, attempts, 1);

/** The cases that every arm ran, so arm totals compare like with like. */
export const sharedCaseNames = (arms: Arm[]): string[] =>
	caseNamesOf(arms).filter((caseName) => arms.every((arm) => armCase(arm, caseName)));

export interface AttemptTotals {
	attempts: number;
	passed: number;
	built: number;
	medianCost: number | null;
	medianTime: number | null;
}

/** Attempts passed (every scenario and expectation), builds and medians per attempt. */
export function attemptTotals(iterations: IterationSummary[]): AttemptTotals {
	return {
		attempts: iterations.length,
		passed: count(iterations, (iteration) => iterationPassed(iteration) === true),
		built: count(iterations, (iteration) => iteration.built === true),
		medianCost: median(iterations.flatMap((iteration) => iteration.metrics?.cost ?? [])),
		medianTime: median(iterations.flatMap((iteration) => iteration.metrics?.wallSeconds ?? [])),
	};
}
