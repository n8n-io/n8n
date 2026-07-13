import { getCaseRunStatus, getCheckedRunCount, getRunScoredCounts } from '../summary';
import type { TestCaseAggregation, WorkflowTestCaseResult } from '../types';
import { baseTestCase } from './fixtures';

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
