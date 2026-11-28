import { bucketFromEvaluation } from '../comparison/bucket-from-evaluation';
import { evaluateGate } from '../comparison/gate';
import { aggregateResults } from '../run/aggregator';
import { computePassRatePerIter } from '../run/persist';
import { getRunScoredCounts } from '../summary';
import type { ExecutionScenario, WorkflowTestCase, WorkflowTestCaseResult } from '../types';

// AGENT-1666: a scenario graded by expectations is not a scored unit itself.
// Its expectations are. The scenario row stays, for display and for rows that
// never reached the judge (framework issues). A scenario without expectations
// counts as before.

const graded: ExecutionScenario = {
	name: 'track-order',
	description: '',
	dataSetup: '',
	successCriteria: '',
	expectations: ['Gives the ship date'],
};

const checklist: ExecutionScenario = {
	name: 'plain',
	description: '',
	dataSetup: '',
	successCriteria: 'works',
};

const testCase: WorkflowTestCase = {
	complexity: 'simple',
	tags: [],
	datasets: ['pr'],
	agentRun: { mode: 'direct' },
	executionScenarios: [graded, checklist],
};

const expectationKey = 'track-order › Gives the ship date';

function run(): WorkflowTestCaseResult {
	return {
		testCase,
		workflowBuildSuccess: true,
		executionScenarioResults: [
			{ scenario: graded, success: false, score: 0, reasoning: 'Failed expectations' },
			{ scenario: checklist, success: true, score: 1, reasoning: 'ok' },
		],
		buildExpectationResults: [{ expectation: expectationKey, pass: false, reason: 'no date' }],
	};
}

function evaluation() {
	return aggregateResults([[run()]], 1);
}

describe('scenarios graded by expectations', () => {
	it('keep their runs but count no trials; their expectations count instead', () => {
		const [tc] = evaluation().testCases;

		const [gradedUnit, checklistUnit] = tc.executionScenarios;
		expect(gradedUnit.runs).toHaveLength(1);
		expect(gradedUnit.evaluatedCount).toBe(0);
		expect(checklistUnit.evaluatedCount).toBe(1);
		expect(tc.buildExpectations.map((e) => [e.expectation, e.evaluatedCount])).toEqual([
			[expectationKey, 1],
		]);
	});

	it('are left out of the per-run scored counts', () => {
		expect(getRunScoredCounts(run())).toEqual({ passCount: 1, totalCount: 2 });
	});

	it('are left out of the per-iteration pass rate', () => {
		expect(computePassRatePerIter(evaluation())).toBe('50%');
	});

	it('are not comparison units', () => {
		const bucket = bucketFromEvaluation(evaluation(), [{ testCase, fileSlug: 'agent-case' }], 'x');

		expect([...bucket.evaluationUnits.keys()].sort()).toEqual([
			`agent-case#expectation:${expectationKey}`,
			'agent-case/plain',
		]);
		expect(bucket.trialTotal).toBe(1);
	});

	it('are not gated', () => {
		const gate = evaluateGate(evaluation(), {
			slugByTestCase: new Map([[testCase, 'agent-case']]),
		});

		expect(gate.units.map((unit) => unit.slug)).not.toContain('agent-case/track-order');
		expect(gate.excluded.map((unit) => unit.slug)).not.toContain('agent-case/track-order');
	});
});
