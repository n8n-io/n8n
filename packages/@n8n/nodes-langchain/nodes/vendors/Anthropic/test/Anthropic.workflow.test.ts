import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
import type { WorkflowTestData } from 'n8n-workflow';
import path from 'node:path';

describe('Anthropic Workflow', () => {
	const baseUrl = 'https://api.anthropic.com';
	const credentials = {
		anthropicApi: { apiKey: 'test-key', url: baseUrl },
	};

	const testHarness = new NodeTestHarness({
		additionalPackagePaths: [path.dirname(require.resolve('n8n-nodes-base'))],
	});

	const file = {
		type: 'file',
		id: 'file_011CNha8iCJcU1wXNR6q4V8w',
		filename: 'report.pdf',
		mime_type: 'application/pdf',
		size_bytes: 1024,
		created_at: '2025-05-01T10:00:00Z',
		downloadable: false,
	};

	const attachedFile = {
		...file,
		id: 'file_011CPMxVD3fHLUhvTqtsQA5w',
	};

	const messageContent = [{ type: 'text', text: 'The document is a quarterly report.' }];

	const testData: WorkflowTestData = {
		description: 'Request URLs for file, message and prompt operations',
		input: {
			workflowData: testHarness.readWorkflowJSON('request-urls.workflow.json'),
		},
		output: {
			nodeExecutionOrder: [
				'When clicking ‘Execute workflow’',
				'Get File',
				'Delete File',
				'List Files',
				'Message a Model',
				'Generate Prompt',
			],
			nodeData: {
				'Get File': [[{ json: { ...file, url: `${baseUrl}/v1/files/${file.id}` } }]],
				'Delete File': [[{ json: { id: file.id, type: 'file_deleted' } }]],
				'List Files': [[{ json: { ...file, url: `${baseUrl}/v1/files/${file.id}` } }]],
				'Message a Model': [[{ json: { content: messageContent } }]],
				'Generate Prompt': [
					[
						{
							json: {
								messages: [{ role: 'user', content: [{ type: 'text', text: 'Plan meals' }] }],
								system: 'You are a chef.',
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
					method: 'get',
					path: `/v1/files/${file.id}`,
					statusCode: 200,
					responseBody: file,
				},
				{
					method: 'delete',
					path: `/v1/files/${file.id}`,
					statusCode: 200,
					responseBody: { id: file.id, type: 'file_deleted' },
				},
				{
					method: 'get',
					path: '/v1/files?limit=1',
					statusCode: 200,
					responseBody: { data: [file], has_more: false, first_id: file.id, last_id: file.id },
				},
				{
					method: 'get',
					path: `/v1/files/${attachedFile.id}`,
					statusCode: 200,
					responseBody: attachedFile,
				},
				{
					method: 'post',
					path: '/v1/messages',
					statusCode: 200,
					responseBody: {
						id: 'msg_01XFDUDYJgAACzvnptvVoYEL',
						type: 'message',
						role: 'assistant',
						model: 'claude-sonnet-4-5-20250929',
						content: messageContent,
						stop_reason: 'end_turn',
						usage: { input_tokens: 10, output_tokens: 8 },
					},
				},
				{
					method: 'post',
					path: '/v1/experimental/generate_prompt',
					statusCode: 200,
					responseBody: {
						messages: [{ role: 'user', content: [{ type: 'text', text: 'Plan meals' }] }],
						system: 'You are a chef.',
						usage: [{ input_tokens: 5, output_tokens: 5 }],
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
