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

describe('Agent V3 Integration', () => {
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

	describe('Basic Completion', () => {
		const testData: WorkflowTestData = {
			description: 'should return basic completion from Agent V3',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/agent-v3-basic.json'),
			},
			output: {
				nodeData: {
					'AI Agent': [
						[
							{
								json: {
									output: 'Hi there!',
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
						responseBody: chatCompletionResponse('Hi there!'),
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});

	describe('Tool Calling Flow', () => {
		const testData: WorkflowTestData = {
			description: 'should execute tool call and return final answer',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/agent-v3-with-tool.json'),
			},
			output: {
				nodeData: {
					'AI Agent': [
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

	describe('Custom System Message', () => {
		const testData: WorkflowTestData = {
			description: 'should pass system message to model',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/agent-v3-system-message.json'),
			},
			output: {
				nodeData: {
					'AI Agent': [
						[
							{
								json: {
									output: 'Ahoy there, matey!',
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
						responseBody: chatCompletionResponse('Ahoy there, matey!'),
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});

	describe('Auto Prompt Type', () => {
		const testData: WorkflowTestData = {
			description: 'should read prompt from chatInput field when promptType is auto',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/agent-v3-auto-prompt.json'),
			},
			output: {
				nodeData: {
					'AI Agent': [
						[
							{
								json: {
									output: 'Hi from auto!',
								},
							},
						],
					],
				},
			},
			trigger: {
				mode: 'trigger',
				input: { json: { chatInput: 'Hello!' } },
			},
			nock: {
				baseUrl,
				mocks: [
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: chatCompletionResponse('Hi from auto!'),
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});

	describe('Fallback Model', () => {
		const testData: WorkflowTestData = {
			description: 'should use fallback model when primary fails',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/agent-v3-fallback-model.json'),
			},
			output: {
				nodeData: {
					'AI Agent': [
						[
							{
								json: {
									output: 'Hello from fallback!',
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
						statusCode: 400,
						responseBody: {
							error: {
								message: 'Bad request',
								type: 'invalid_request_error',
								code: null,
							},
						},
					},
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: chatCompletionResponse('Hello from fallback!'),
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});

	describe('Output Parser', () => {
		const testData: WorkflowTestData = {
			description: 'should parse structured output via format_final_json_response tool',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/agent-v3-output-parser.json'),
			},
			output: {
				nodeData: {
					'AI Agent': [
						[
							{
								json: {
									output: {
										state: 'California',
										cities: ['Los Angeles', 'San Francisco'],
									},
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
								name: 'format_final_json_response',
								arguments: JSON.stringify({
									output: {
										state: 'California',
										cities: ['Los Angeles', 'San Francisco'],
									},
								}),
							},
						]),
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});

	describe('Intermediate Steps', () => {
		const testData: WorkflowTestData = {
			description: 'should include intermediate steps when returnIntermediateSteps is enabled',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/agent-v3-intermediate-steps.json'),
			},
			output: {
				nodeData: {
					'AI Agent': [
						[
							{
								json: {
									output: '5 times 5 equals 25.',
									intermediateSteps: expect.arrayContaining([
										expect.objectContaining({
											action: expect.objectContaining({
												tool: 'Calculator',
												toolCallId: 'call_1',
											}),
											observation: expect.any(String),
										}),
									]),
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
								name: 'Calculator',
								arguments: JSON.stringify({ input: '5*5' }),
							},
						]),
					},
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

	describe('Continue-on-Fail', () => {
		const testData: WorkflowTestData = {
			description: 'should return error in output when continueOnFail is enabled',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/agent-v3-continue-on-fail.json'),
			},
			output: {
				nodeData: {
					'AI Agent': [
						[
							{
								json: {
									error: expect.any(String),
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
						statusCode: 400,
						responseBody: {
							error: {
								message: 'Bad request',
								type: 'invalid_request_error',
								code: null,
							},
						},
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});

	describe('Memory Integration', () => {
		const testData: WorkflowTestData = {
			description: 'should complete successfully with buffer window memory connected',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/agent-v3-memory.json'),
			},
			output: {
				nodeData: {
					'AI Agent': [
						[
							{
								json: {
									output: 'I remember everything!',
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
						responseBody: chatCompletionResponse('I remember everything!'),
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});

	describe('Binary Image Passthrough', () => {
		const testData: WorkflowTestData = {
			description: 'should complete successfully with binary image data in input',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/agent-v3-binary-images.json'),
			},
			output: {
				nodeData: {
					'AI Agent': [
						[
							{
								json: {
									output: 'I see a cat in the image.',
								},
							},
						],
					],
				},
			},
			trigger: {
				mode: 'trigger',
				input: {
					json: { chatInput: 'What is in this image?' },
					binary: {
						image: {
							mimeType: 'image/png',
							data: Buffer.from('fake-png-data').toString('base64'),
							fileName: 'test.png',
						},
					},
				},
			},
			nock: {
				baseUrl,
				mocks: [
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: chatCompletionResponse('I see a cat in the image.'),
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});
});
