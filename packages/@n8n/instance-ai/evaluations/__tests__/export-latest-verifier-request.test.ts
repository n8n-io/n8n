import { buildNativeVerifierRequestBody, VERIFIER_MAX_OUTPUT_TOKENS } from '../checklist/verifier';
import { findStoredTestCaseResult, findStoredVerifierRun } from '../eval-results-artifact';
import { buildVerifierRequestBody, getScenarios } from '../export-latest-verifier-request';

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

	it('asks for the reasoning before the verdict in the replayed request schema', () => {
		const body = buildVerifierRequestBody('user message', 'openai/gpt-5.5');

		// Structured output writes keys in schema order, so `pass` must come after `reasoning`.
		const item = body.text.format.schema.properties.results.items;
		const keys = ['id', 'reasoning', 'pass', 'failureCategory', 'rootCause'];
		expect(Object.keys(item.properties)).toEqual(keys);
		expect(item.required).toEqual(keys);
	});

	it('sends the same output limit and reasoning effort as the live verifier', () => {
		const body = buildVerifierRequestBody('user message', 'openai/gpt-5.5');

		expect(body.max_output_tokens).toBe(VERIFIER_MAX_OUTPUT_TOKENS);
		expect(body.reasoning).toEqual({ effort: 'high' });
	});

	it('uses the same instructions, schema and request settings as the live verifier', () => {
		expect(buildVerifierRequestBody('user message', 'openai/gpt-5.5')).toEqual(
			buildNativeVerifierRequestBody('user message', 'gpt-5.5'),
		);
	});

	it('targets the judge model, not the builder model', () => {
		vi.stubEnv('N8N_INSTANCE_AI_MODEL', 'openai/gpt-5.5');
		vi.stubEnv('N8N_INSTANCE_AI_EVAL_JUDGE_MODEL', 'openai/gpt-5.4-mini');
		try {
			expect(buildVerifierRequestBody('user message').model).toBe('gpt-5.4-mini');
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it('refuses an openai id with an empty model, which the live verifier does not route to OpenAI', () => {
		// resolveEvalModelConfig('openai/').provider is '' (splitModelId keeps a blank model
		// as the raw id), so the live verifier sends no native Responses request for it.
		expect(() => buildVerifierRequestBody('user message', 'openai/')).toThrow(
			/only an OpenAI judge/i,
		);
	});

	it('refuses a judge model that does not use the native OpenAI request', () => {
		expect(() => buildVerifierRequestBody('user message', 'anthropic/claude-sonnet-5-5')).toThrow(
			/only an OpenAI judge/i,
		);
	});
});
