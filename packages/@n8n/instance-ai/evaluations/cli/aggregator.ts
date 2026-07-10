import { collectExpectations } from '../build-expectations/collect';
import type {
	WorkflowTestCaseResult,
	MultiRunEvaluation,
	TestCaseAggregation,
	ExecutionScenarioAggregation,
	BuildExpectationAggregation,
	BuildExpectationResult,
	ArtifactUnitAggregation,
	ArtifactType,
	ArtifactVerdict,
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
 * Aggregates one measured unit (a build expectation, or an artifact type) across runs.
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
 * Collapse all of a run's verdicts for one artifact TYPE into a single unit value.
 * A run passes the type only if every measured (non-incomplete) verdict passes, so a
 * second failed or `unexpected` artifact of the same type can't be masked by a passing
 * first one. Prefers a failing verdict as the representative so its reason/assertions
 * surface in reports; all-incomplete folds to a single incomplete (excluded from scoring).
 */
function foldRunArtifacts(verdicts: ArtifactVerdict[]): ArtifactVerdict | undefined {
	if (verdicts.length === 0) return undefined;
	const measured = verdicts.filter((v) => !v.incomplete);
	if (measured.length === 0) return { ...verdicts[0], pass: false, incomplete: true };
	const failing = measured.find((v) => !v.pass);
	return { ...(failing ?? measured[0]), pass: failing === undefined, incomplete: false };
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

		// Aggregate each non-workflow artifact TYPE as a measured unit alongside scenarios and
		// build expectations. One unit per type: either an expected non-workflow type, or an
		// `unexpected` type that appeared in at least one run.
		const expectedTypes = (testCase.expectedArtifacts ?? ['workflow']).filter(
			(t) => t !== 'workflow',
		);
		const unexpectedTypes = runs.flatMap((r) =>
			(r.artifactResults ?? []).filter((v) => v.unexpected).map((v) => v.type),
		);
		const artifactTypes: ArtifactType[] = [...new Set([...expectedTypes, ...unexpectedTypes])];

		const artifacts: ArtifactUnitAggregation[] = artifactTypes.map((type) => ({
			type,
			...aggregateUnit<ArtifactVerdict>(
				runs.map((r) => foldRunArtifacts((r.artifactResults ?? []).filter((v) => v.type === type))),
			),
		}));

		testCases.push({
			testCase,
			runs,
			buildSuccessCount,
			executionScenarios,
			buildExpectations,
			artifacts,
		});
	}

	return { totalRuns, testCases };
}
