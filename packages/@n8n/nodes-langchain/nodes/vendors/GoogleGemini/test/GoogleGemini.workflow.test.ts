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
		description: 'Request URLs for the file upload operation',
		input: {
			workflowData: testHarness.readWorkflowJSON('request-urls.workflow.json'),
		},
		output: {
			nodeExecutionOrder: ['When clicking ‘Execute workflow’', 'Upload File'],
			nodeData: {
				'Upload File': [[{ json: { fileUri: file.uri, mimeType: file.mimeType } }]],
			},
		},
		nock: {
			baseUrl,
			mocks: [
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
