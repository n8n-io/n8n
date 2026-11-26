import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import pick from 'lodash/pick';
import nock from 'nock';
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

	const assistantId = 'asst_abc123';
	const fileId = 'file-XjGxS3KTG0uNmNOK362iJua3';
	const updatedAssistant = { ...assistants[0], name: 'Math Tutor' };
	const deletedAssistant = { id: assistantId, object: 'assistant.deleted', deleted: true };
	const deletedFile = { id: fileId, object: 'file', deleted: true };

	const requestUrlsTestData: WorkflowTestData = {
		description: 'Request URLs for assistant and file operations',
		input: {
			workflowData: testHarness.readWorkflowJSON('request-urls.workflow.json'),
		},
		output: {
			nodeExecutionOrder: [
				'When clicking ‘Execute workflow’',
				'Update Assistant',
				'Delete Assistant',
				'Delete File',
			],
			nodeData: {
				'Update Assistant': [[{ json: updatedAssistant }]],
				'Delete Assistant': [[{ json: deletedAssistant }]],
				'Delete File': [[{ json: deletedFile }]],
			},
		},
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'get',
					path: `/assistants/${assistantId}`,
					statusCode: 200,
					responseBody: assistants[0],
				},
				{
					method: 'post',
					path: `/assistants/${assistantId}`,
					statusCode: 200,
					responseBody: updatedAssistant,
				},
				{
					method: 'delete',
					path: `/assistants/${assistantId}`,
					statusCode: 200,
					responseBody: deletedAssistant,
				},
				{
					method: 'delete',
					path: `/files/${fileId}`,
					statusCode: 200,
					responseBody: deletedFile,
				},
			],
		},
	};

	testHarness.setupTest(requestUrlsTestData, {
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
