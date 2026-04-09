import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import path from 'node:path';
import type { WorkflowTestData } from 'n8n-workflow';

// CI has cold-start overhead on the first test (coverage instrumentation, module loading)
jest.setTimeout(10_000);

/**
 * Helper to create an OpenAI chat completion response with tool calls.
 */
function toolCallResponse(toolCalls: Array<{ id: string; name: string; arguments: string }>) {
	return {
		id: 'chatcmpl-test',
		object: 'chat.completion',
		created: 1700000000,
		model: 'gpt-4o-mini',
		choices: [
			{
				index: 0,
				message: {
					role: 'assistant',
					content: null,
					tool_calls: toolCalls.map((tc) => ({
						id: tc.id,
						type: 'function',
						function: {
							name: tc.name,
							arguments: tc.arguments,
						},
					})),
				},
				finish_reason: 'tool_calls',
			},
		],
		usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
	};
}

/**
 * Regression test for GHC-7516: $getPairedItem lineage error when AI Agent
 * is connected to If node's false branch with continueErrorOutput enabled.
 *
 * Bug behavior:
 * 1. AI Agent (v3.1) is connected to If node's false branch (Output Index 1)
 * 2. Agent has maxIterations set to 2 and onError set to "continueErrorOutput"
 * 3. When agent hits maxIterations limit:
 *    EXPECTED: Error should route to Error output (index 1)
 *    ACTUAL: Throws "$getPairedItem lineage error" and outputs empty string
 *            through Success output (index 0) instead of Error output
 *
 * Impact: Downstream nodes expecting error messages receive empty data, causing
 * cascading failures.
 *
 * Workaround: Placing a NoOp node between If node and AI Agent resolves the issue.
 *
 * Related: https://github.com/n8n-io/n8n/issues/27767
 */
describe.skip('Agent V3 If Node Lineage (GHC-7516)', () => {
	const baseUrl = 'https://api.openai.com';
	const credentials = {
		openAiApi: {
			apiKey: 'test-api-key',
			url: `${baseUrl}/v1`,
		},
	};

	const testHarness = new NodeTestHarness({
		additionalPackagePaths: [path.dirname(require.resolve('n8n-nodes-base'))],
	});

	test('should handle maxIterations error when AI Agent is on If node false branch', () => {
		// This test documents the bug reported in GHC-7516
		// The test is currently skipped because the workflow execution fails
		// with "Data for node 'AI Agent' is missing!" which may be related to
		// the $getPairedItem lineage error mentioned in the bug report.
		//
		// When this bug is fixed:
		// 1. Remove the describe.skip
		// 2. The test should pass, showing that the AI Agent properly routes
		//    maxIterations errors to the Error output when on the If false branch

		const testData: WorkflowTestData = {
			description:
				'AI Agent on If false branch should route maxIterations error to Error output',
			input: {
				workflowData: testHarness.readWorkflowJSON(
					'workflows/agent-v3-if-false-branch-max-iterations.json',
				),
			},
			output: {
				nodeData: {
					'AI Agent': [
						// Success output (index 0) should be empty when maxIterations is hit
						[],
						// Error output (index 1) should contain the maxIterations error
						[
							{
								json: {
									error: expect.stringContaining('Max iterations'),
								},
							},
						],
					],
				},
			},
			trigger: {
				mode: 'trigger',
				input: {
					json: { shouldProceed: false }, // Routes to If node's false branch
				},
			},
			nock: {
				baseUrl,
				mocks: [
					// First iteration - agent calls tool
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: toolCallResponse([
							{
								id: 'call_1',
								name: 'Calculator',
								arguments: JSON.stringify({ input: '5*5' }),
							},
						]),
					},
					// Second iteration - agent calls tool again, hitting maxIterations=2
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: toolCallResponse([
							{
								id: 'call_2',
								name: 'Calculator',
								arguments: JSON.stringify({ input: '3+3' }),
							},
						]),
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});
});
