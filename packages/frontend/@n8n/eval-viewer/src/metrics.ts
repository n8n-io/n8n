/** Pure aggregations for the views. Per-build counts and medians come from summary.json as is. */
import type { Arm, BuildTotals, FirstBuild, IterationSummary, MetricKey, ToolStat } from './schema';

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

export function sumToolStats(lists: ToolStat[][]): ToolStat[] {
	const totals = new Map<string, ToolStat>();
	for (const stat of lists.flat()) {
		const current = totals.get(stat.tool);
		totals.set(
			stat.tool,
			current
				? {
						tool: stat.tool,
						calls: current.calls + stat.calls,
						failed: current.failed + stat.failed,
						timeMs: current.timeMs + stat.timeMs,
						tokens: current.tokens + stat.tokens,
					}
				: stat,
		);
	}
	return [...totals.values()];
}

export const iterationsOfArm = (arm: Arm): IterationSummary[] =>
	arm.cases.flatMap((armCase) => armCase.iterations);

export const caseNamesOf = (arms: Arm[]): string[] =>
	[...new Set(arms.flatMap((arm) => arm.cases.map((armCase) => armCase.name)))].sort();

export const armCase = (arm: Arm, caseName: string) =>
	arm.cases.find((entry) => entry.name === caseName);

/** True when the build saved a workflow and every scenario passed; null for an unknown verdict. */
export function iterationPassed(iteration: IterationSummary): boolean | null {
	if (iteration.built === false || iteration.buildError) return false;
	if (iteration.scenarios.length > 0) return iteration.scenarios.every((run) => run.passed);
	return iteration.built;
}

export const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);

/** Mean per build, from summary.json sums. */
export function meanPerBuild(totals: BuildTotals, key: MetricKey): number | null {
	const sum = totals.sum[key];
	return sum === null || totals.builds === 0 ? null : sum / totals.builds;
}

export type Direction = 'better' | 'worse' | 'same' | null;

export function direction(
	base: number | null,
	value: number | null,
	higherIsBetter: boolean | null,
): Direction {
	if (base === null || value === null || higherIsBetter === null) return null;
	if (Math.abs(value - base) < 1e-9) return 'same';
	return value > base === higherIsBetter ? 'better' : 'worse';
}
