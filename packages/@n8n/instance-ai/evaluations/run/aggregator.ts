import { collectExpectations } from '../build-expectations/collect';
import type {
	WorkflowTestCaseResult,
	MultiRunEvaluation,
	TestCaseAggregation,
	ExecutionScenarioAggregation,
	BuildExpectationAggregation,
	BuildExpectationResult,
	CaseVerificationStatus,
} from '../types';

/**
 * Binomial coefficient C(n, k). Returns 0 when k > n.
 */
function combinations(n: number, k: number): number {
	if (k > n || k < 0) return 0;
	if (k === 0 || k === n) return 1;
	let result = 1;
	for (let i = 0; i < k; i++) {
		result = (result * (n - i)) / (i + 1);
	}
	return Math.round(result);
}

/**
 * pass@k = 1 - C(n - c, k) / C(n, k)
 * Probability that at least 1 of k randomly chosen samples passes,
 * given n total samples of which c passed.
 */
export function passAtK(n: number, c: number, k: number): number {
	if (k > n) return 0;
	const denominator = combinations(n, k);
	if (denominator === 0) return 0;
	return 1 - combinations(n - c, k) / denominator;
}

/**
 * pass^k = (c/n)^k
 * Probability that all k independent attempts pass,
 * given observed success rate p = c/n.
 */
export function passHatK(n: number, c: number, k: number): number {
	if (n === 0) return 0;
	return Math.pow(c / n, k);
}

function computePassMetrics(
	n: number,
	c: number,
): { passAtKValues: number[]; passHatKValues: number[] } {
	const passAtKValues: number[] = [];
	const passHatKValues: number[] = [];
	for (let k = 1; k <= n; k++) {
		passAtKValues.push(passAtK(n, c, k));
		passHatKValues.push(passHatK(n, c, k));
	}
	return { passAtKValues, passHatKValues };
}

/**
 * Aggregates one measured unit (a build expectation) across runs.
 * `incomplete` verdicts are excluded from the count (denominator = evaluated runs).
 */
function aggregateUnit<T extends { pass: boolean; incomplete?: boolean }>(
	perRun: Array<T | undefined>,
): {
	runs: T[];
	evaluatedCount: number;
	passCount: number;
	passRate: number;
	passAtK: number[];
	passHatK: number[];
} {
	const runs = perRun.filter((v): v is T => v !== undefined);
	const evaluated = runs.filter((v) => !v.incomplete);
	const passCount = evaluated.filter((v) => v.pass).length;
	const n = evaluated.length;
	const { passAtKValues, passHatKValues } = computePassMetrics(n, passCount);
	return {
		runs,
		evaluatedCount: n,
		passCount,
		passRate: n > 0 ? passCount / n : 0,
		passAtK: passAtKValues,
		passHatK: passHatKValues,
	};
}

/**
 * A case is `notVerified` when nothing could be scored: every scenario and every
 * build expectation came back with 0 evaluated runs (all incomplete, or skipped —
 * e.g. process expectations with no transcript). A build FAILURE is NOT a gap: the
 * aggregator substitutes a non-incomplete "scenario not executed" result, so a
 * build-failed case has evaluated (failing) scenarios and stays `verified`.
 */
function computeCaseStatus(
	scenarios: ExecutionScenarioAggregation[],
	expectations: BuildExpectationAggregation[],
): CaseVerificationStatus {
	const evaluatedUnits =
		scenarios.reduce((n, sa) => n + sa.evaluatedCount, 0) +
		expectations.reduce((n, ea) => n + ea.evaluatedCount, 0);
	return evaluatedUnits > 0 ? 'verified' : 'notVerified';
}

export function aggregateResults(
	allRunResults: WorkflowTestCaseResult[][],
	totalRuns: number,
): MultiRunEvaluation {
	const testCaseCount = allRunResults[0].length;
	const testCases: TestCaseAggregation[] = [];

	for (let tcIdx = 0; tcIdx < testCaseCount; tcIdx++) {
		const runs = allRunResults.map((runResults) => runResults[tcIdx]);
		const testCase = runs[0].testCase;
		const buildSuccessCount = runs.filter((r) => r.workflowBuildSuccess).length;

		const scenarioCount = (testCase.executionScenarios ?? []).length;
		const executionScenarios: ExecutionScenarioAggregation[] = [];

		for (let sIdx = 0; sIdx < scenarioCount; sIdx++) {
			const scenario = (testCase.executionScenarios ?? [])[sIdx];
			const scenarioRuns = runs.map(
				(r) =>
					r.executionScenarioResults[sIdx] ?? {
						scenario,
						success: false,
						score: 0,
						reasoning: 'Build failed — scenario not executed',
					},
			);
			// Verifier-incomplete runs carry no verdict — excluded from the count,
			// mirroring build expectations (denominator = evaluated runs).
			const evaluated = scenarioRuns.filter((sr) => !sr.incomplete);
			const passCount = evaluated.filter((sr) => sr.success).length;
			const n = evaluated.length;
			const { passAtKValues, passHatKValues } = computePassMetrics(n, passCount);

			executionScenarios.push({
				scenario,
				runs: scenarioRuns,
				evaluatedCount: n,
				passCount,
				passRate: n > 0 ? passCount / n : 0,
				passAtK: passAtKValues,
				passHatK: passHatKValues,
			});
		}

		// Aggregate each build expectation as a measured unit alongside scenarios.
		const buildExpectations: BuildExpectationAggregation[] = collectExpectations(testCase).map(
			(expectation) => ({
				expectation,
				...aggregateUnit<BuildExpectationResult>(
					runs.map((r) =>
						(r.buildExpectationResults ?? []).find((e) => e.expectation === expectation),
					),
				),
			}),
		);

		testCases.push({
			testCase,
			runs,
			buildSuccessCount,
			executionScenarios,
			buildExpectations,
			status: computeCaseStatus(executionScenarios, buildExpectations),
		});
	}

	return { totalRuns, testCases };
}
