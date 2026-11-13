import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
import type { WorkflowTestData } from 'n8n-workflow';
import path from 'node:path';

describe('Moonshot Workflow', () => {
	const baseUrl = 'https://api.moonshot.ai/v1';
	const credentials = {
		moonshotApi: { apiKey: 'test-key', region: 'international', url: baseUrl },
	};

	const testHarness = new NodeTestHarness({
		additionalPackagePaths: [path.dirname(require.resolve('n8n-nodes-base'))],
	});

	const testData: WorkflowTestData = {
		description: 'Request URL for the message operation',
		input: {
			workflowData: testHarness.readWorkflowJSON('request-urls.workflow.json'),
		},
		output: {
			nodeExecutionOrder: ['When clicking ‘Execute workflow’', 'Message a Model'],
			nodeData: {
				'Message a Model': [[{ json: { content: 'Waves fold into foam' } }]],
			},
		},
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'post',
					path: '/chat/completions',
					statusCode: 200,
					responseBody: {
						id: 'chatcmpl-6810567267ee141b4630dccb',
						object: 'chat.completion',
						model: 'kimi-k2.6',
						choices: [
							{
								index: 0,
								finish_reason: 'stop',
								message: { role: 'assistant', content: 'Waves fold into foam' },
							},
						],
						usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
					},
				},
			],
		},
	};

	testHarness.setupTest(testData, {
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
