import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import pick from 'lodash/pick';
import type { WorkflowTestData } from 'n8n-workflow';
import path from 'node:path';

describe('OpenAI Workflow', () => {
	const baseUrl = 'https://api.openai.com/v1';
	const credentials = {
		openAiApi: { url: baseUrl },
	};

	const testHarness = new NodeTestHarness({
		additionalPackagePaths: [path.dirname(require.resolve('n8n-nodes-base'))],
	});

	const assistants = [
		{
			id: 'asst_abc123',
			object: 'assistant',
			created_at: 1698982736,
			name: 'Coding Tutor',
			description: null,
			model: 'gpt-4o',
			tools: [],
			tool_resources: {},
			metadata: {},
			top_p: 1.0,
			temperature: 1.0,
			response_format: 'auto',
		},
		{
			id: 'asst_abc456',
			object: 'assistant',
			created_at: 1698982718,
			name: 'My Assistant',
			description: null,
			model: 'gpt-4o',
			tools: [],
			tool_resources: {},
			metadata: {},
			top_p: 1.0,
			temperature: 1.0,
			response_format: 'auto',
		},
	];

	const testData: WorkflowTestData = {
		description: 'List Assistants',
		input: {
			workflowData: testHarness.readWorkflowJSON('list-assistants.workflow.json'),
		},
		output: {
			nodeExecutionOrder: ['When clicking ‘Execute workflow’', 'OpenAI'],
			nodeData: {
				OpenAI: [
					assistants.map((assistant) => ({
						json: pick(assistant, ['id', 'model', 'name']),
					})),
				],
			},
		},
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'get',
					path: '/assistants?limit=100',
					statusCode: 200,
					responseBody: {
						object: 'list',
						data: assistants,
					},
				},
			],
		},
	};

	testHarness.setupTest(testData, { credentials });
});
