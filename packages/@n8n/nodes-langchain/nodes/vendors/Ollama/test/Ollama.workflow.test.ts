import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
import type { WorkflowTestData } from 'n8n-workflow';
import path from 'node:path';

describe('Ollama Workflow', () => {
	const baseUrl = 'http://localhost:11434';
	const credentials = {
		ollamaApi: { baseUrl: `${baseUrl}/` },
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
					path: '/api/chat',
					statusCode: 200,
					responseBody: {
						model: 'llama3.2:latest',
						created_at: '2026-10-09T10:00:00.000Z',
						message: { role: 'assistant', content: 'Waves fold into foam' },
						done: true,
						prompt_eval_count: 10,
						eval_count: 5,
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
