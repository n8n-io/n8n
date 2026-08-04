import { findStoredTestCaseResult, findStoredVerifierRun } from '../eval-results-artifact';
import { getScenarios } from '../export-latest-verifier-request';

function evalResult(marker: string) {
	return {
		success: true,
		nodeResults: {
			[marker]: {
				interceptedRequests: [],
				executionMode: 'real' as const,
			},
		},
		errors: [],
		hints: {
			warnings: [],
			triggerContent: {},
		},
	};
}

describe('export-latest-verifier-request helpers', () => {
	it('reads workflow test case executionScenarios', () => {
		const scenario = {
			name: 'happy-path',
			description: '',
			dataSetup: '',
			successCriteria: '',
		};

		expect(getScenarios({ executionScenarios: [scenario] })).toEqual([scenario]);
	});

	it('selects stored eval results within the requested test case', () => {
		const testCase = {
			conversation: [{ role: 'user' as const, text: 'Prompt B' }],
			executionScenarios: [
				{
					name: 'happy-path',
					description: '',
					dataSetup: '',
					successCriteria: '',
				},
			],
		};
		const evalResults = {
			testCases: [
				{
					name: 'Prompt A',
					testCaseFile: 'other-case',
					scenarios: [
						{
							name: 'happy-path',
							runs: [{ workflowId: 'wf-other', evalResult: evalResult('other-node') }],
						},
					],
				},
				{
					name: 'Prompt B',
					testCaseFile: 'target-case',
					scenarios: [
						{
							name: 'happy-path',
							runs: [
								{ evalResult: evalResult('unusable-without-workflow-id') },
								{ workflowId: 'wf-target', evalResult: evalResult('target-node') },
							],
						},
					],
				},
			],
		};

		const storedTestCase = findStoredTestCaseResult(
			evalResults,
			'/tmp/target-case.json',
			testCase.conversation[0]?.text.slice(0, 70),
		);
		const storedRun = findStoredVerifierRun(storedTestCase, 'happy-path');

		expect(storedRun?.runIndex).toBe(1);
		expect(storedRun?.evalResult.nodeResults).toHaveProperty('target-node');
		expect(storedRun?.workflowId).toBe('wf-target');
	});
});
