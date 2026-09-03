import { bucketFromEvaluation } from '../comparison/bucket-from-evaluation';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import type {
	BuildExpectationAggregation,
	ExecutionScenarioAggregation,
	MultiRunEvaluation,
	WorkflowTestCase,
} from '../types';

function testCase(): WorkflowTestCase {
	return {
		conversation: [{ role: 'user', text: 'build it' }],
		complexity: 'simple',
		tags: [],
		datasets: ['full'],
	} as WorkflowTestCase;
}

function scenarioAggregation(
	name: string,
	runs: Array<{ success: boolean; incomplete?: boolean; failureCategory?: string }>,
): ExecutionScenarioAggregation {
	const evaluated = runs.filter((r) => !r.incomplete);
	return {
		scenario: { name, description: '', dataSetup: '', successCriteria: '' },
		runs: runs.map((r) => ({
			scenario: { name, description: '', dataSetup: '', successCriteria: '' },
			success: r.success,
			score: r.success ? 1 : 0,
			reasoning: '',
			failureCategory: r.failureCategory,
			...(r.incomplete ? { incomplete: true } : {}),
		})),
		evaluatedCount: evaluated.length,
		passCount: evaluated.filter((r) => r.success).length,
		passRate: 0,
		passAtK: [],
		passHatK: [],
	};
}

function expectationAggregation(
	expectation: string,
	passCount: number,
	evaluatedCount: number,
): BuildExpectationAggregation {
	return {
		expectation,
		runs: [],
		evaluatedCount,
		passCount,
		passRate: evaluatedCount > 0 ? passCount / evaluatedCount : 0,
		passAtK: [],
		passHatK: [],
	};
}

function fixture(): { evaluation: MultiRunEvaluation; withFiles: WorkflowTestCaseWithFile[] } {
	const tc = testCase();
	const evaluation: MultiRunEvaluation = {
		totalRuns: 3,
		testCases: [
			{
				testCase: tc,
				runs: [],
				buildSuccessCount: 3,
				executionScenarios: [
					scenarioAggregation('happy', [
						{ success: true },
						{ success: false, failureCategory: 'builder_issue' },
						{ success: false, incomplete: true },
					]),
				],
				buildExpectations: [
					expectationAggregation('asks before building', 2, 3),
					expectationAggregation('never judged', 0, 0),
				],
				status: 'verified',
			},
		],
	};
	return { evaluation, withFiles: [{ testCase: tc, fileSlug: 'my-case' }] };
}

describe('bucketFromEvaluation', () => {
	it('emits scenario and evaluated-expectation units under their kind-specific keys', () => {
		const { evaluation, withFiles } = fixture();
		const bucket = bucketFromEvaluation(evaluation, withFiles, 'pr-exp');

		expect(bucket.evaluationUnits.get('my-case/happy')).toMatchObject({
			kind: 'scenario',
			name: 'happy',
			passed: 1,
			total: 2, // incomplete run outside the denominator
		});
		expect(bucket.evaluationUnits.get('my-case#expectation:asks before building')).toMatchObject({
			kind: 'expectation',
			name: 'asks before building',
			passed: 2,
			total: 3,
		});
	});

	it('excludes expectations with no evaluated verdicts', () => {
		const { evaluation, withFiles } = fixture();
		const bucket = bucketFromEvaluation(evaluation, withFiles, 'pr-exp');

		expect(bucket.evaluationUnits.get('my-case#expectation:never judged')).toBeUndefined();
		expect(bucket.evaluationUnits.size).toBe(2);
	});

	it('keeps trialTotal and failure categories scenario-only', () => {
		const { evaluation, withFiles } = fixture();
		const bucket = bucketFromEvaluation(evaluation, withFiles, 'pr-exp');

		// 2 evaluated scenario runs; expectation trials never counted here.
		expect(bucket.trialTotal).toBe(2);
		expect(bucket.failureCategoryTotals).toEqual({ builder_issue: 1 });
	});

	it('throws when a test case has no file slug', () => {
		const { evaluation } = fixture();
		expect(() => bucketFromEvaluation(evaluation, [], 'pr-exp')).toThrow(/no fileSlug/);
	});
});
