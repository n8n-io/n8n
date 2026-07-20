import {
	getCaseRunStatus,
	getCheckedRunCount,
	getRunScoredCounts,
	rollupCaseVerification,
} from '../summary';
import type {
	ExecutionScenarioAggregation,
	TestCaseAggregation,
	WorkflowTestCaseResult,
} from '../types';
import { baseTestCase } from './fixtures';

describe('rollupCaseVerification', () => {
	function scenarioAgg(
		overrides: Partial<ExecutionScenarioAggregation> = {},
	): ExecutionScenarioAggregation {
		return {
			scenario: { name: 's', description: '', dataSetup: '', successCriteria: 'ok' },
			runs: [],
			evaluatedCount: 1,
			passCount: 1,
			passRate: 1,
			passAtK: [1],
			passHatK: [1],
			...overrides,
		};
	}

	function caseAgg(overrides: Partial<TestCaseAggregation>): TestCaseAggregation {
		return {
			testCase: baseTestCase(),
			runs: [],
			buildSuccessCount: 1,
			executionScenarios: [],
			buildExpectations: [],
			status: 'verified',
			...overrides,
		};
	}

	it('counts a not-verified case separately from passed and failed', () => {
		const cases: TestCaseAggregation[] = [
			caseAgg({ status: 'verified', executionScenarios: [scenarioAgg({ passCount: 1 })] }),
			caseAgg({
				status: 'verified',
				executionScenarios: [scenarioAgg({ passCount: 0, passRate: 0 })],
			}),
			caseAgg({
				status: 'notVerified',
				executionScenarios: [scenarioAgg({ evaluatedCount: 0, passCount: 0, passRate: 0 })],
			}),
		];

		expect(rollupCaseVerification(cases)).toEqual({ passed: 1, failed: 1, notVerified: 1 });
	});

	it('does not count a not-verified case as passed', () => {
		const cases: TestCaseAggregation[] = [
			caseAgg({
				status: 'notVerified',
				executionScenarios: [scenarioAgg({ evaluatedCount: 0, passCount: 0, passRate: 0 })],
			}),
		];

		const rollup = rollupCaseVerification(cases);
		expect(rollup.passed).toBe(0);
		expect(rollup.notVerified).toBe(1);
	});
});

// A scenario-less case (e.g. an agent build that saves its artifact outside the workflow path)
// legitimately produces no workflow (workflowBuildSuccess: false). These lock in that such a run
// is scored on its outcome expectations — which cover the rendered agent/config-eval context —
// and reported as CHECKED, not BUILD FAILED.
describe('summary — scenario-less cases (no workflow)', () => {
	function agentOnlyResult(
		overrides: Partial<WorkflowTestCaseResult> = {},
	): WorkflowTestCaseResult {
		return {
			testCase: baseTestCase({ outcomeExpectations: ['the agent has a Slack tool'] }),
			workflowBuildSuccess: false,
			executionScenarioResults: [],
			buildExpectationResults: [
				{ expectation: 'the agent has a Slack tool', pass: true, reason: 'has one' },
			],
			...overrides,
		};
	}

	describe('getCaseRunStatus', () => {
		it('reports CHECKED for a scenario-less run that judged its outcome expectations', () => {
			expect(getCaseRunStatus(agentOnlyResult())).toBe('checked');
		});

		it('reports build_failed for a workflow (scenario) case that produced no workflow', () => {
			const result: WorkflowTestCaseResult = {
				testCase: baseTestCase({
					executionScenarios: [
						{ name: 's', description: '', dataSetup: '', successCriteria: 'ok' },
					],
				}),
				workflowBuildSuccess: false,
				executionScenarioResults: [],
			};
			expect(getCaseRunStatus(result)).toBe('build_failed');
		});

		it('reports build_failed for a scenario-less case that judged nothing scoreable', () => {
			expect(getCaseRunStatus(agentOnlyResult({ buildExpectationResults: [] }))).toBe(
				'build_failed',
			);
		});
	});

	describe('getRunScoredCounts', () => {
		it('counts a passing outcome expectation as a scored unit even with no workflow', () => {
			expect(getRunScoredCounts(agentOnlyResult())).toEqual({ passCount: 1, totalCount: 1 });
		});

		it('counts a failing outcome expectation toward the denominator', () => {
			const result = agentOnlyResult({
				buildExpectationResults: [
					{ expectation: 'the agent has a Slack tool', pass: false, reason: 'no tool' },
				],
			});
			expect(getRunScoredCounts(result)).toEqual({ passCount: 0, totalCount: 1 });
		});
	});

	describe('getCheckedRunCount', () => {
		it('counts runs that judged an expectation for a scenario-less case', () => {
			const tc: TestCaseAggregation = {
				testCase: baseTestCase({ outcomeExpectations: ['has a Slack tool'] }),
				runs: [agentOnlyResult(), agentOnlyResult({ buildExpectationResults: [] })],
				buildSuccessCount: 0,
				executionScenarios: [],
				buildExpectations: [],
			};
			// Only the first run judged an expectation.
			expect(getCheckedRunCount(tc)).toBe(1);
		});
	});
});
