import type {
	WorkflowTestCaseResult,
	MultiRunEvaluation,
	TestCaseAggregation,
	ScenarioAggregation,
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

		const scenarioCount = testCase.scenarios.length;
		const scenarios: ScenarioAggregation[] = [];

		for (let sIdx = 0; sIdx < scenarioCount; sIdx++) {
			const scenario = testCase.scenarios[sIdx];
			const scenarioRuns = runs.map(
				(r) =>
					r.scenarioResults[sIdx] ?? {
						scenario,
						success: false,
						score: 0,
						reasoning: 'Build failed — scenario not executed',
					},
			);
			const passCount = scenarioRuns.filter((sr) => sr.success).length;
			const { passAtKValues, passHatKValues } = computePassMetrics(totalRuns, passCount);

			scenarios.push({
				scenario,
				runs: scenarioRuns,
				passCount,
				passRate: totalRuns > 0 ? passCount / totalRuns : 0,
				passAtK: passAtKValues,
				passHatK: passHatKValues,
			});
		}

		testCases.push({ testCase, runs, buildSuccessCount, scenarios });
	}

	return { totalRuns, testCases };
}
