import { workflowExpectedForCase } from '../harness/runner';

describe('workflowExpectedForCase', () => {
	const scenario = {
		name: 'happy-path',
		description: '',
		dataSetup: '',
		successCriteria: '',
	};

	it('expects a workflow when the case declares execution scenarios', () => {
		expect(workflowExpectedForCase({ executionScenarios: [scenario] })).toBe(true);
	});

	it('expects a workflow when the case declares outcome expectations', () => {
		expect(workflowExpectedForCase({ outcomeExpectations: ['Saves a workflow'] })).toBe(true);
	});

	it('expects no workflow for answer-only cases (neither scenarios nor outcome expectations)', () => {
		expect(workflowExpectedForCase({})).toBe(false);
		expect(workflowExpectedForCase({ executionScenarios: [], outcomeExpectations: [] })).toBe(
			false,
		);
	});
});
