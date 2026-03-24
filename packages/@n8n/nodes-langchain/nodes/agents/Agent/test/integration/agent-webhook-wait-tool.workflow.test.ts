import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import path from 'node:path';
import type { WorkflowTestData } from 'n8n-workflow';

// CI has cold-start overhead on the first test (coverage instrumentation, module loading)
jest.setTimeout(10_000);

/**
 * Helper to create a standard OpenAI chat completion response.
 */
function chatCompletionResponse(content: string) {
	return {
		id: 'chatcmpl-test',
		object: 'chat.completion',
		created: 1700000000,
		model: 'gpt-4o-mini',
		choices: [
			{
				index: 0,
				message: { role: 'assistant', content },
				finish_reason: 'stop',
			},
		],
		usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
	};
}

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

describe('Agent with Webhook Wait Tool Integration - GHC-7201', () => {
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

	describe('Workflow Tool with Wait Node', () => {
		/**
		 * Test case for GHC-7201:
		 * When an agent uses a sub-workflow tool that contains a webhook wait node,
		 * the agent should receive the output from the final executed node (after the wait),
		 * not the output from the wait node itself.
		 *
		 * Bug: The agent's output becomes undefined or identical to the wait node's output,
		 * rather than the final node's output.
		 *
		 * Expected: Agent should receive "Final result: processed" from the Code node.
		 * Actual (bug): Agent receives undefined or wait node's output.
		 */
		const testData: WorkflowTestData = {
			description:
				'should receive output from final node in sub-workflow after webhook wait, not from wait node',
			input: {
				workflowData: testHarness.readWorkflowJSON(
					'workflows/agent-webhook-wait-tool-basic.json',
				),
			},
			output: {
				nodeData: {
					'Main Agent': [
						[
							{
								json: {
									output: 'The workflow processed the data and returned: Final result: processed',
								},
							},
						],
					],
				},
			},
			nock: {
				baseUrl,
				mocks: [
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: toolCallResponse([
							{
								id: 'call_1',
								name: 'SubWorkflowTool',
								arguments: JSON.stringify({ input: 'test data' }),
							},
						]),
					},
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: chatCompletionResponse(
							'The workflow processed the data and returned: Final result: processed',
						),
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});
});
