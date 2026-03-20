import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import path from 'node:path';
import type { WorkflowTestData } from 'n8n-workflow';

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

/**
 * GHC-5636: AI Agent V3 Tool Loop Bug
 *
 * Issue: When using AI Agent V3 with tools (e.g., DataTable, Calculator), the agent
 * enters an infinite loop repeatedly calling the same tool.
 *
 * Root Cause: In runAgent.ts, the `steps` array (tool call history) is passed to
 * the executor but never converted to `agent_scratchpad`. The LangChain prompt template
 * expects `{agent_scratchpad}` to contain previous tool calls and results, but V3
 * doesn't populate it. Without this history, the LLM doesn't know it already called
 * the tool, so it keeps calling it again.
 *
 * Expected: After calling a tool once, the LLM should receive the tool result via
 * agent_scratchpad and provide a final answer (2 LLM calls total).
 *
 * Actual: Without agent_scratchpad, the LLM doesn't see the tool result, thinks it
 * needs to call the tool again, creating an infinite loop (3+ LLM calls).
 *
 * Location: packages/@n8n/nodes-langchain/nodes/agents/Agent/agents/ToolsAgent/V3/helpers/runAgent.ts
 * Line 53-55, 84-85, 119-122
 *
 * Reference: https://linear.app/n8n/issue/GHC-5636
 */
describe('AI Agent V3 Tool Loop Bug (GHC-5636)', () => {
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

	describe('Infinite loop reproduction', () => {
		/**
		 * This test demonstrates the bug by showing that the agent makes 3+ LLM calls
		 * when it should only make 2 (tool call + final answer).
		 *
		 * We only provide 2 nock mocks. If the bug is present, the test will fail
		 * because the agent tries to make a 3rd call (tool loop) that has no mock.
		 *
		 * Expected flow (correct behavior):
		 * 1. LLM call: "What is 5*3?" -> Tool call to calculator
		 * 2. LLM call with agent_scratchpad containing tool result -> Final answer "15"
		 *
		 * Actual flow (bug):
		 * 1. LLM call: "What is 5*3?" -> Tool call to calculator
		 * 2. LLM call WITHOUT tool history -> Tool call to calculator again (loop)
		 * 3. Nock fails: No more mocks available
		 */
		const testData: WorkflowTestData = {
			description:
				'should call tool once and provide final answer (fails due to infinite loop bug)',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflows/agent-v3-tool-infinite-loop.json'),
			},
			output: {
				nodeData: {
					'AI Agent': [
						[
							{
								json: {
									output: expect.stringContaining('15'),
								},
							},
						],
					],
				},
			},
			nock: {
				baseUrl,
				mocks: [
					// First call: Agent decides to use calculator
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: toolCallResponse([
							{
								id: 'call_1',
								name: 'calculator',
								arguments: JSON.stringify({ input: '5 * 3' }),
							},
						]),
					},
					// Second call: Should provide final answer with tool result in context
					// BUG: agent_scratchpad is empty, so LLM doesn't see tool result,
					// thinks it needs to call tool again, causing loop
					{
						method: 'post',
						path: '/v1/chat/completions',
						statusCode: 200,
						responseBody: chatCompletionResponse('The answer is 15.'),
					},
					// No third mock provided - if bug is present, test fails here
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});
});
