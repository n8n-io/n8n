import { getCaseRunStatus, getCheckedRunCount, getRunScoredCounts } from '../summary';
import type { TestCaseAggregation, WorkflowTestCaseResult } from '../types';
import { baseTestCase } from './fixtures';

// An agent/config-eval-only case saves its artifact outside the workflow path, so the
// build legitimately produces no workflow (workflowBuildSuccess: false). These lock in
// that such a run is scored on its artifacts and reported as CHECKED, not BUILD FAILED.
describe('summary — artifact-only cases (no workflow)', () => {
	function agentOnlyResult(
		overrides: Partial<WorkflowTestCaseResult> = {},
	): WorkflowTestCaseResult {
		return {
			testCase: baseTestCase({
				expectedArtifacts: ['agent'],
				artifactExpectations: { agent: ['the agent has a Slack tool'] },
			}),
			workflowBuildSuccess: false,
			executionScenarioResults: [],
			artifactResults: [{ type: 'agent', id: 'agent-1', pass: true }],
			...overrides,
		};
	}

	describe('getCaseRunStatus', () => {
		it('reports CHECKED for an agent-only run that produced its artifact', () => {
			expect(getCaseRunStatus(agentOnlyResult())).toBe('checked');
		});

		it('still reports build_failed for a workflow case that produced no workflow', () => {
			const result: WorkflowTestCaseResult = {
				testCase: baseTestCase({ outcomeExpectations: ['posts to Slack'] }),
				workflowBuildSuccess: false,
				executionScenarioResults: [],
			};
			expect(getCaseRunStatus(result)).toBe('build_failed');
		});

		it('reports build_failed for an artifact-only case that produced nothing scoreable', () => {
			expect(getCaseRunStatus(agentOnlyResult({ artifactResults: [] }))).toBe('build_failed');
		});
	});

	describe('getRunScoredCounts', () => {
		it('counts a passing artifact as a scored unit even with no workflow', () => {
			expect(getRunScoredCounts(agentOnlyResult())).toEqual({ passCount: 1, totalCount: 1 });
		});

		it('counts a failing artifact toward the denominator', () => {
			const result = agentOnlyResult({
				artifactResults: [{ type: 'agent', id: 'agent-1', pass: false, reason: 'no tool' }],
			});
			expect(getRunScoredCounts(result)).toEqual({ passCount: 0, totalCount: 1 });
		});
	});

	describe('getCheckedRunCount', () => {
		it('counts runs that produced an artifact for a workflow-less case', () => {
			const tc: TestCaseAggregation = {
				testCase: baseTestCase({
					expectedArtifacts: ['agent'],
					artifactExpectations: { agent: ['has a Slack tool'] },
				}),
				runs: [agentOnlyResult(), agentOnlyResult({ artifactResults: [] })],
				buildSuccessCount: 0,
				executionScenarios: [],
				buildExpectations: [],
				artifacts: [],
			};
			// Only the first run discovered an artifact.
			expect(getCheckedRunCount(tc)).toBe(1);
		});
	});
});
