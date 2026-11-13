import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
import type { WorkflowTestData } from 'n8n-workflow';
import path from 'node:path';

describe('Google Gemini Workflow', () => {
	const baseUrl = 'https://generativelanguage.googleapis.com';
	const credentials = {
		googlePalmApi: { apiKey: 'test-key', host: baseUrl },
	};

	const testHarness = new NodeTestHarness({
		additionalPackagePaths: [path.dirname(require.resolve('n8n-nodes-base'))],
	});

	const store = {
		name: 'fileSearchStores/product-manuals-k3x9q2m7v1ab',
		displayName: 'Product manuals',
		createTime: '2025-11-03T10:00:00.000000Z',
		updateTime: '2025-11-03T10:00:00.000000Z',
	};

	const file = {
		name: 'files/8k2m4n6p9q1r',
		uri: `${baseUrl}/v1beta/files/8k2m4n6p9q1r`,
		mimeType: 'application/pdf',
		state: 'ACTIVE',
	};

	const uploadPath = '/upload/v1beta/files?upload_id=AHVrFxN7k2mQ9pL4&upload_protocol=resumable';

	beforeEach(() => {
		nock('https://example.com')
			.get('/manual.pdf')
			.reply(200, 'pdf content', { 'content-type': 'application/pdf' });
	});

	const testData: WorkflowTestData = {
		description: 'Request URLs for file search store and file upload operations',
		input: {
			workflowData: testHarness.readWorkflowJSON('request-urls.workflow.json'),
		},
		output: {
			nodeExecutionOrder: [
				'When clicking ‘Execute workflow’',
				'Create Store',
				'List Stores',
				'Upload File',
			],
			nodeData: {
				'Create Store': [[{ json: store }]],
				'List Stores': [[{ json: { fileSearchStores: [store] } }]],
				'Upload File': [[{ json: { fileUri: file.uri, mimeType: file.mimeType } }]],
			},
		},
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'post',
					path: '/v1beta/fileSearchStores',
					statusCode: 200,
					requestBody: { displayName: 'Product manuals' },
					responseBody: store,
				},
				{
					method: 'get',
					path: '/v1beta/fileSearchStores?pageSize=10',
					statusCode: 200,
					responseBody: { fileSearchStores: [store] },
				},
				{
					method: 'post',
					path: '/upload/v1beta/files',
					statusCode: 200,
					responseBody: {},
					responseHeaders: { 'x-goog-upload-url': `${baseUrl}${uploadPath}` },
				},
				{
					method: 'post',
					path: uploadPath,
					statusCode: 200,
					responseBody: { file },
				},
			],
		},
	};

	testHarness.setupTest(testData, {
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
