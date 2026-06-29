import { aggregateResults } from '../cli/aggregator';
import type { WorkflowTestCase, WorkflowTestCaseResult } from '../types';

const TEST_CASE: WorkflowTestCase = {
	conversation: [{ role: 'user', text: 'Classify this request only.' }],
	complexity: 'simple',
	tags: ['intent-resolution'],
	processExpectations: ['The agent classifies the request.'],
	datasets: ['full'],
	executionScenarios: [
		{
			name: 'intent-only-response',
			description: 'No executable workflow expected',
			dataSetup: 'No data required',
			successCriteria: 'The agent only reports intent.',
		},
	],
};

function noWorkflowResult(): WorkflowTestCaseResult {
	return {
		testCase: TEST_CASE,
		workflowBuildSuccess: false,
		executionScenarioResults: [],
		buildExpectationResults: [
			{
				expectation: 'The agent classifies the request.',
				pass: true,
				reason: 'classified',
			},
		],
	};
}

describe('aggregateResults case-set behavior', () => {
	it('keeps strict missing-scenario failures for workflow evals', () => {
		const evaluation = aggregateResults([[noWorkflowResult()]], 1);
		const [scenario] = evaluation.testCases[0].executionScenarios;

		expect(scenario.passCount).toBe(0);
		expect(scenario.runs[0].reasoning).toBe('Build failed — scenario not executed');
		expect(evaluation.testCases[0].buildExpectations[0].passCount).toBe(1);
	});

	it('does not synthesize missing-scenario failures for agents evals', () => {
		const evaluation = aggregateResults([[noWorkflowResult()]], 1, { caseSet: 'agents' });

		expect(evaluation.testCases[0].executionScenarios).toEqual([]);
		expect(evaluation.testCases[0].buildExpectations[0].passCount).toBe(1);
	});
});
