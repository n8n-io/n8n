import { abortedWorkflowTestCaseResult } from '../harness/runner';
import { classifyScenarioExecutionError } from '../harness/transient-error';
import { aggregateResults } from '../run/aggregator';
import type { ExecutionScenario, WorkflowTestCase, WorkflowTestCaseResult } from '../types';

// ---------------------------------------------------------------------------
// TRUST-310: a per-iteration budget / timeout abort must never lose the
// scenarios that already completed, and the offending scenario must be stamped
// with the pinned cross-repo contract so the lang-tracer side can route it to
// an infra bucket instead of counting it against product quality.
//
//   - `failureCategory: "framework_issue"` (verbatim — do NOT invent a new one)
//   - a `rootCause` string that mentions the timeout/budget
// ---------------------------------------------------------------------------

describe('classifyScenarioExecutionError', () => {
	it('stamps a budget/timeout abort as framework_issue with a timeout rootCause', () => {
		// undici's AbortSignal.timeout surfaces as this message via the n8n client.
		const message = 'TimeoutError: The operation was aborted due to timeout';

		const classified = classifyScenarioExecutionError(message);

		expect(classified.failureCategory).toBe('framework_issue');
		expect(classified.rootCause).toBeDefined();
		expect(classified.rootCause?.toLowerCase()).toMatch(/timeout|budget/);
		expect(classified.rootCause).toContain(message);
		expect(classified.reasoning).toContain(message);
	});

	it('stamps a non-timeout framework error without a timeout rootCause', () => {
		const message = 'fetch failed: ECONNRESET';

		const classified = classifyScenarioExecutionError(message);

		// Still framework_issue (any error escaping executeScenario is infra), but
		// no timeout-flavoured rootCause — only budget aborts carry that.
		expect(classified.failureCategory).toBe('framework_issue');
		expect(classified.rootCause).toBeUndefined();
		expect(classified.reasoning).toContain(message);
	});
});

function makeTestCase(scenarios: ExecutionScenario[]): WorkflowTestCase {
	return {
		conversation: [{ role: 'user', text: 'build me something' }],
		complexity: 'complex',
		tags: ['test'],
		datasets: ['full'],
		executionScenarios: scenarios,
	};
}

const scenarioA: ExecutionScenario = {
	name: 'happy path',
	description: 'a',
	dataSetup: 'setup a',
	successCriteria: 'criteria a',
};
const scenarioB: ExecutionScenario = {
	name: 'edge case',
	description: 'b',
	dataSetup: 'setup b',
	successCriteria: 'criteria b',
};

describe('abortedWorkflowTestCaseResult', () => {
	it('produces a build-failed result with one framework_issue row per scenario', () => {
		const testCase = makeTestCase([scenarioA, scenarioB]);
		const message = 'TimeoutError: The operation was aborted due to timeout';

		const result = abortedWorkflowTestCaseResult(testCase, 'http://localhost:5678', message);

		expect(result.workflowBuildSuccess).toBe(false);
		expect(result.buildError).toContain(message);
		expect(result.n8nBaseUrl).toBe('http://localhost:5678');
		// One result per declared scenario keeps the aggregator's positional index
		// aligned so the case is counted rather than the whole batch being lost.
		expect(result.executionScenarioResults).toHaveLength(2);
		for (const sr of result.executionScenarioResults) {
			expect(sr.success).toBe(false);
			expect(sr.score).toBe(0);
			expect(sr.failureCategory).toBe('framework_issue');
			expect(sr.rootCause?.toLowerCase()).toMatch(/timeout|budget/);
		}
	});
});

describe('aggregateResults with a mid-run abort', () => {
	it('keeps the completed case alongside an aborted case', () => {
		// Case A completed before the abort: built + its scenario passed.
		const caseA = makeTestCase([scenarioA]);
		const completed: WorkflowTestCaseResult = {
			testCase: caseA,
			workflowBuildSuccess: true,
			workflowId: 'Wa',
			executionScenarioResults: [
				{ scenario: scenarioA, success: true, score: 1, reasoning: 'passed' },
			],
		};

		// Case B threw on a budget/timeout abort — captured instead of lost.
		const caseB = makeTestCase([scenarioB]);
		const aborted = abortedWorkflowTestCaseResult(
			caseB,
			'http://localhost:5678',
			'TimeoutError: The operation was aborted due to timeout',
		);

		const evaluation = aggregateResults([[completed, aborted]], 1);

		expect(evaluation.testCases).toHaveLength(2);

		// The passing scenario survives the abort and is counted.
		const aggA = evaluation.testCases[0];
		expect(aggA.executionScenarios[0].passCount).toBe(1);
		expect(aggA.executionScenarios[0].evaluatedCount).toBe(1);

		// The aborted scenario is present and carries the pinned contract.
		const aggB = evaluation.testCases[1];
		const abortedRun = aggB.executionScenarios[0].runs[0];
		expect(abortedRun.success).toBe(false);
		expect(abortedRun.failureCategory).toBe('framework_issue');
		expect(abortedRun.rootCause?.toLowerCase()).toMatch(/timeout|budget/);
	});
});
