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

describe('Agent V3 with Guardrails', () => {
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

	describe('Guardrails Input with Auto Prompt', () => {
		// This test reproduces GHC-7418: AI Agent in auto mode should recognize guardrailsInput
		// from Guardrails node but currently fails with "No prompt specified"
		const testData: WorkflowTestData = {
			description:
				'should accept guardrailsInput when AI Agent is in auto mode with Guardrails upstream',
			input: {
				workflowData: testHarness.readWorkflowJSON(
					'workflows/agent-v3-guardrails-auto-prompt.json',
				),
			},
			output: {
				nodeData: {
					'AI Agent': [
						[
							{
								json: {
									output: "I'm here to help! What can I assist you with?",
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
						responseBody: chatCompletionResponse(
							"I'm here to help! What can I assist you with?",
						),
					},
				],
			},
		};

		testHarness.setupTest(testData, { credentials });
	});
});
