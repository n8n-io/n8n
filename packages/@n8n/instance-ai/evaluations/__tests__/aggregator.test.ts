import { aggregateResults } from '../cli/aggregator';
import type { ExecutionScenario, WorkflowTestCase, WorkflowTestCaseResult } from '../types';

const scenario: ExecutionScenario = {
	name: 'happy-path',
	description: 'baseline',
	dataSetup: 'plain',
	successCriteria: 'works',
};

const testCase: WorkflowTestCase = {
	conversation: [{ role: 'user', text: 'build it' }],
	complexity: 'simple',
	tags: [],
	executionScenarios: [scenario],
	datasets: ['full'],
};

function makeRunResult(run: {
	success: boolean;
	incomplete?: boolean;
	failureCategory?: string;
}): WorkflowTestCaseResult {
	return {
		testCase,
		workflowBuildSuccess: true,
		executionScenarioResults: [
			{
				scenario,
				success: run.success,
				score: run.success ? 1 : 0,
				reasoning: run.success ? 'ok' : 'nope',
				failureCategory: run.failureCategory,
				...(run.incomplete ? { incomplete: true } : {}),
			},
		],
	};
}

describe('aggregateResults — verifier-incomplete scenario runs', () => {
	it('keeps incomplete runs out of the denominator but visible in runs', () => {
		const allRuns = [
			[makeRunResult({ success: true })],
			[makeRunResult({ success: false, failureCategory: 'builder_issue' })],
			[
				makeRunResult({
					success: false,
					incomplete: true,
					failureCategory: 'verification_failure',
				}),
			],
		];

		const evaluation = aggregateResults(allRuns, 3);
		const sa = evaluation.testCases[0].executionScenarios[0];

		expect(sa.runs).toHaveLength(3);
		expect(sa.evaluatedCount).toBe(2);
		expect(sa.passCount).toBe(1);
		expect(sa.passRate).toBe(0.5);
		// pass metrics computed over evaluated runs only (n=2)
		expect(sa.passAtK).toHaveLength(2);
		expect(sa.passAtK[0]).toBeCloseTo(0.5);
		expect(sa.passAtK[1]).toBeCloseTo(1);
	});

	it('reports evaluatedCount 0 when every run is incomplete', () => {
		const allRuns = [
			[makeRunResult({ success: false, incomplete: true })],
			[makeRunResult({ success: false, incomplete: true })],
		];

		const evaluation = aggregateResults(allRuns, 2);
		const sa = evaluation.testCases[0].executionScenarios[0];

		expect(sa.evaluatedCount).toBe(0);
		expect(sa.passCount).toBe(0);
		expect(sa.passRate).toBe(0);
		expect(sa.passAtK).toEqual([]);
		expect(sa.runs).toHaveLength(2);
	});

	it('leaves fully-evaluated scenarios unchanged', () => {
		const allRuns = [
			[makeRunResult({ success: true })],
			[makeRunResult({ success: true })],
			[makeRunResult({ success: false, failureCategory: 'mock_issue' })],
		];

		const evaluation = aggregateResults(allRuns, 3);
		const sa = evaluation.testCases[0].executionScenarios[0];

		expect(sa.evaluatedCount).toBe(3);
		expect(sa.passCount).toBe(2);
		expect(sa.passRate).toBeCloseTo(2 / 3);
		expect(sa.passAtK).toHaveLength(3);
	});
});
