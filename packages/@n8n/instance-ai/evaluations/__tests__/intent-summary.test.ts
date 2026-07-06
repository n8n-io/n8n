import { computeIntentSummary } from '../intent/summary';
import type {
	IntentCaseGrade,
	MultiRunEvaluation,
	TestCaseAggregation,
	WorkflowTestCase,
	WorkflowTestCaseResult,
} from '../types';

function caseResult(testCase: WorkflowTestCase, grade: IntentCaseGrade): WorkflowTestCaseResult {
	return { testCase, workflowBuildSuccess: true, executionScenarioResults: [], intentGrade: grade };
}

function aggregation(
	testCase: WorkflowTestCase,
	runs: WorkflowTestCaseResult[],
): TestCaseAggregation {
	return {
		testCase,
		runs,
		buildSuccessCount: runs.length,
		executionScenarios: [],
		buildExpectations: [],
	};
}

const wfTestCase: WorkflowTestCase = {
	complexity: 'simple',
	tags: ['scheduled'],
	datasets: ['agents'],
	intentExpectation: {
		context: 'standalone',
		accepts: [{ anchor: 'wf', embedsOther: false }],
		rationale: 'Fixed trigger + fixed action.',
		source: 'synthetic',
	},
};

const falseFriendTestCase: WorkflowTestCase = {
	complexity: 'simple',
	tags: ['false-friend'],
	datasets: ['agents'],
	intentExpectation: {
		context: 'standalone',
		accepts: [{ anchor: 'agent', embedsOther: false }],
		rationale: "Says 'workflow' but is agent-shaped.",
		source: 'synthetic',
	},
};

describe('computeIntentSummary', () => {
	it('returns undefined when no case carries an intentExpectation', () => {
		const evaluation: MultiRunEvaluation = {
			totalRuns: 1,
			testCases: [
				aggregation({ complexity: 'simple', tags: [], datasets: ['full'] }, [
					{
						testCase: { complexity: 'simple', tags: [], datasets: ['full'] },
						workflowBuildSuccess: true,
						executionScenarioResults: [],
					},
				]),
			],
		};
		expect(computeIntentSummary(evaluation)).toBeUndefined();
	});

	it('computes joint/per-field accuracy, mean rationale score, and slices over a small fixture', () => {
		const passingRun = caseResult(wfTestCase, {
			parts: [
				{
					jointPass: true,
					anchorMatch: true,
					embedsMatch: true,
					rationaleScore: 2,
					reason: 'match',
				},
			],
		});
		const failingRun = caseResult(wfTestCase, {
			parts: [
				{
					jointPass: false,
					anchorMatch: true,
					embedsMatch: false,
					rationaleScore: 1,
					reason: 'embeds_other mismatch',
				},
			],
		});
		const falseFriendRun = caseResult(falseFriendTestCase, {
			parts: [{ jointPass: true, anchorMatch: true, embedsMatch: true, reason: 'match' }],
		});

		const evaluation: MultiRunEvaluation = {
			totalRuns: 2,
			testCases: [
				aggregation(wfTestCase, [passingRun, failingRun]),
				aggregation(falseFriendTestCase, [falseFriendRun]),
			],
		};

		const summary = computeIntentSummary(evaluation);
		expect(summary).toBeDefined();
		if (!summary) return;

		expect(summary.caseCount).toBe(2);
		expect(summary.runCount).toBe(3);
		expect(summary.jointAccuracy).toBeCloseTo(2 / 3);
		expect(summary.anchorAccuracy).toBe(1);
		expect(summary.embedsAccuracy).toBeCloseTo(2 / 3);
		expect(summary.meanRationaleScore).toBeCloseTo(1.5);

		const sliceByKey = new Map(summary.slices.map((s) => [s.key, s]));
		expect(sliceByKey.get('anchor:wf')).toMatchObject({ total: 2, passCount: 1 });
		expect(sliceByKey.get('anchor:agent')).toMatchObject({ total: 1, passCount: 1 });
		expect(sliceByKey.get('tag:scheduled')).toMatchObject({ total: 2, passCount: 1 });
		expect(sliceByKey.get('tag:false-friend')).toMatchObject({ total: 1, passCount: 1 });
		expect(sliceByKey.get('context:standalone')).toMatchObject({ total: 3, passCount: 2 });
		expect(sliceByKey.get('complexity:simple')).toMatchObject({ total: 3, passCount: 2 });
		expect(sliceByKey.get('source:synthetic')).toMatchObject({ total: 3, passCount: 2 });
	});

	it('reports monitoring bars as met/not-met against their thresholds, and omits bars with no data', () => {
		const passingRun = caseResult(wfTestCase, {
			parts: [{ jointPass: true, anchorMatch: true, embedsMatch: true, reason: 'match' }],
		});
		const failingRun = caseResult(wfTestCase, {
			parts: [{ jointPass: false, anchorMatch: true, embedsMatch: false, reason: 'mismatch' }],
		});
		const falseFriendRun = caseResult(falseFriendTestCase, {
			parts: [{ jointPass: true, anchorMatch: true, embedsMatch: true, reason: 'match' }],
		});

		const evaluation: MultiRunEvaluation = {
			totalRuns: 2,
			testCases: [
				aggregation(wfTestCase, [passingRun, failingRun]),
				aggregation(falseFriendTestCase, [falseFriendRun]),
			],
		};

		const summary = computeIntentSummary(evaluation);
		expect(summary).toBeDefined();
		if (!summary) return;

		const barByLabel = new Map(summary.monitoringBars.map((b) => [b.bar, b]));

		const jointBar = barByLabel.get('joint accuracy >= 75%');
		expect(jointBar?.met).toBe(false);
		expect(jointBar?.actual).toBeCloseTo(2 / 3);

		const falseFriendBar = barByLabel.get('false-friend slice >= 80%');
		expect(falseFriendBar?.met).toBe(true);
		expect(falseFriendBar?.actual).toBe(1);

		const easyBar = barByLabel.get('easy (complexity: simple) slice >= 90%');
		expect(easyBar?.met).toBe(false);
		expect(easyBar?.actual).toBeCloseTo(2 / 3);
	});
});
