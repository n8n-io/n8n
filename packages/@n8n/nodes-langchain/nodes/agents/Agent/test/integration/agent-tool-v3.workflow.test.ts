import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import path from 'node:path';

// CI has cold-start overhead on the first test (coverage instrumentation, module loading)
vi.setConfig({
	testTimeout: 10000,
});

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

	describe('Agent as Tool with inner tool calls (AI-2494)', () => {
		// Regression test for the case where the sub-agent's LLM emits a tool
		// call. Before the AI-2494 fix the sub-agent returned an EngineRequest
		// that the parent's tool boundary rejected with
		// "The Tool attempted to return an engine request, …" — this fixture
		// proves the parent sees the sub-agent's real final answer instead.
		const testData: WorkflowTestData = {
			description:
				'should let a sub-agent invoke its own tools inline and surface the result to the parent',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/sub-agent-with-inner-tool.json'),
			},
			output: {
				nodeData: {
					'Parent Agent': [
						[
							{
								json: {
									output: '5 times 5 equals 25.',
								},
							},
						],
					],
				},
			},
			nock: {
				baseUrl,
				mocks: [
					// 1. Parent agent decides to call the sub-agent
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: toolCallResponse([
							{
								id: 'call_parent_1',
								name: 'MathSubAgent',
								arguments: JSON.stringify({ input: 'What is 5 times 5?' }),
							},
						]),
					},
					// 2. Sub-agent's LLM decides to call the Calculator. Pre-fix
					//    this would produce an EngineRequest the parent's tool
					//    boundary couldn't fulfil.
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: toolCallResponse([
							{
								id: 'call_calc_1',
								name: 'Calculator',
								arguments: JSON.stringify({ input: '5 * 5' }),
							},
						]),
					},
					// 3. Sub-agent's LLM receives the calculator result and
					//    produces a final text answer.
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: chatCompletionResponse('5 times 5 equals 25.'),
					},
					// 4. Parent agent receives the sub-agent's answer and
					//    produces its own final response.
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: chatCompletionResponse('5 times 5 equals 25.'),
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});
});
