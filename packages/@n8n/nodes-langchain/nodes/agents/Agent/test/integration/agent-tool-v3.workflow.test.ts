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

describe('AgentTool V3 Integration', () => {
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

	describe('Agent as Tool', () => {
		const testData: WorkflowTestData = {
			description: 'should execute sub-agent tool and return parent final answer',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/agent-tool-v3-basic.json'),
			},
			output: {
				nodeData: {
					'Parent Agent': [
						[
							{
								json: {
									output: '2+2 equals 4.',
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
								name: 'SubAgent',
								arguments: JSON.stringify({ input: 'What is 2+2?' }),
							},
						]),
					},
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: chatCompletionResponse('2+2 equals 4.'),
					},
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: chatCompletionResponse('2+2 equals 4.'),
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});
});
