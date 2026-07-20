import { aggregateResults } from '../cli/aggregator';
import type { ExecutionScenario, WorkflowTestCase, WorkflowTestCaseResult } from '../types';

const scenario: ExecutionScenario = {
	name: 'happy-path',
	description: 'baseline',
	dataSetup: 'plain',
	successCriteria: 'works',
};

const incompleteTestCase: WorkflowTestCase = {
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
		testCase: incompleteTestCase,
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

describe('aggregateResults — case verification status', () => {
	it('marks a case notVerified when every scenario run is incomplete', () => {
		const allRuns = [
			[makeRunResult({ success: false, incomplete: true })],
			[makeRunResult({ success: false, incomplete: true })],
		];

		const evaluation = aggregateResults(allRuns, 2);

		expect(evaluation.testCases[0].status).toBe('notVerified');
	});

	it('marks a case verified when at least one scenario run was evaluated', () => {
		const allRuns = [
			[makeRunResult({ success: true })],
			[makeRunResult({ success: false, incomplete: true })],
		];

		const evaluation = aggregateResults(allRuns, 2);

		expect(evaluation.testCases[0].status).toBe('verified');
	});

	it('marks a build-failed case verified — a build failure is a verified failure, not a gap', () => {
		// Build failures substitute a non-incomplete "scenario not executed" result,
		// so they count as evaluated failures rather than an unverifiable gap.
		const buildFailedCase: WorkflowTestCase = {
			...incompleteTestCase,
		};
		const allRuns = [
			[
				{
					testCase: buildFailedCase,
					workflowBuildSuccess: false,
					executionScenarioResults: [],
				},
			],
		];

		const evaluation = aggregateResults(allRuns, 1);

		expect(evaluation.testCases[0].executionScenarios[0].evaluatedCount).toBe(1);
		expect(evaluation.testCases[0].status).toBe('verified');
	});

	it('marks a case notVerified when its only expectations were skipped (prebuilt process gap)', () => {
		// A process-only case run without a transcript (prebuilt/MCP) judges nothing:
		// the expectation is absent from every run, so nothing could be verified.
		const processOnlyCase: WorkflowTestCase = {
			...incompleteTestCase,
			executionScenarios: undefined,
			processExpectations: ['asks before building'],
		};
		const allRuns = [
			[
				{
					testCase: processOnlyCase,
					workflowBuildSuccess: true,
					executionScenarioResults: [],
					buildExpectationResults: [],
				},
			],
		];

		const evaluation = aggregateResults(allRuns, 1);

		expect(evaluation.testCases[0].status).toBe('notVerified');
	});
});

describe('aggregateResults — build expectations as units', () => {
	const expectationCase: WorkflowTestCase = {
		...incompleteTestCase,
		executionScenarios: undefined,
		processExpectations: ['asks before building'],
		outcomeExpectations: ['workflow has a trigger'],
	};

	function expectationRun(
		verdicts: Array<{ expectation: string; pass: boolean; incomplete?: boolean }>,
	): WorkflowTestCaseResult {
		return {
			testCase: expectationCase,
			workflowBuildSuccess: true,
			executionScenarioResults: [],
			buildExpectationResults: verdicts.map((v) => ({
				expectation: v.expectation,
				pass: v.pass,
				reason: v.pass ? 'ok' : 'nope',
				...(v.incomplete ? { incomplete: true } : {}),
			})),
		};
	}

	it('aggregates per-expectation counts in process-then-outcome order', () => {
		const allRuns = [
			[
				expectationRun([
					{ expectation: 'asks before building', pass: true },
					{ expectation: 'workflow has a trigger', pass: true },
				]),
			],
			[
				expectationRun([
					{ expectation: 'asks before building', pass: true },
					{ expectation: 'workflow has a trigger', pass: false },
				]),
			],
		];

		const evaluation = aggregateResults(allRuns, 2);
		const [process, outcome] = evaluation.testCases[0].buildExpectations;

		expect(process.expectation).toBe('asks before building');
		expect(process).toMatchObject({ evaluatedCount: 2, passCount: 2 });
		expect(process.passAtK).toHaveLength(2);
		expect(outcome.expectation).toBe('workflow has a trigger');
		expect(outcome).toMatchObject({ evaluatedCount: 2, passCount: 1 });
	});

	it('keeps judge-incomplete and missing verdicts out of the denominator', () => {
		const allRuns = [
			[
				expectationRun([
					{ expectation: 'asks before building', pass: true },
					{ expectation: 'workflow has a trigger', pass: true },
				]),
			],
			[
				// Judge returned an incomplete verdict for one expectation and
				// nothing at all for the other.
				expectationRun([{ expectation: 'asks before building', pass: false, incomplete: true }]),
			],
		];

		const evaluation = aggregateResults(allRuns, 2);
		const [process, outcome] = evaluation.testCases[0].buildExpectations;

		expect(process).toMatchObject({ evaluatedCount: 1, passCount: 1 });
		expect(outcome).toMatchObject({ evaluatedCount: 1, passCount: 1 });
	});

	it('reports evaluatedCount 0 for an expectation the judge never evaluated', () => {
		const allRuns = [[expectationRun([])], [expectationRun([])]];

		const evaluation = aggregateResults(allRuns, 2);
		for (const ea of evaluation.testCases[0].buildExpectations) {
			expect(ea).toMatchObject({ evaluatedCount: 0, passCount: 0 });
			expect(ea.passAtK).toEqual([]);
		}
	});
});
