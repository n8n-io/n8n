import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
import type { WorkflowTestData } from 'n8n-workflow';
import path from 'node:path';

describe('OpenAI V2 Workflow', () => {
	const baseUrl = 'https://api.openai.com/v1';
	const credentials = {
		openAiApi: { apiKey: 'test-key', url: baseUrl },
	};

	const testHarness = new NodeTestHarness({
		additionalPackagePaths: [path.dirname(require.resolve('n8n-nodes-base'))],
	});

	beforeEach(() => {
		const originalSetTimeout = global.setTimeout;
		jest
			.spyOn(global, 'setTimeout')
			.mockImplementation(((callback: () => void, ms?: number) =>
				originalSetTimeout(callback, ms === 5_000 || ms === 10_000 ? 0 : ms)) as typeof setTimeout);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	const fileId = 'file-XjGxS3KTG0uNmNOK362iJua3';
	const conversationId = 'conv_689667905b048191b4740501625afd940c7533ace33a2dab';
	const videoId = 'video_68d7512d07848190b3e45da0ecbebcde004da08e1e0678d5';
	const responseId = 'resp_67ccd2bed1ec8190b14f964abc0542670bb6a6b452d3795b';

	const conversation = {
		id: conversationId,
		object: 'conversation',
		created_at: 1741900000,
		metadata: { topic: 'billing' },
	};
	const deletedConversation = { id: conversationId, object: 'conversation.deleted', deleted: true };
	const deletedFile = { id: fileId, object: 'file', deleted: true };
	const video = { id: videoId, object: 'video', model: 'sora-2', status: 'completed' };
	const outputMessage = {
		type: 'message',
		id: 'msg_67ccd2bf17f0819081ff3bb2cf6508e60bb6a6b452d3795b',
		status: 'completed',
		role: 'assistant',
		content: [{ type: 'output_text', text: 'Waves fold into foam', annotations: [] }],
	};
	const backgroundResponse = {
		id: responseId,
		object: 'response',
		status: 'completed',
		model: 'gpt-4.1-mini',
		output: [outputMessage],
	};

	const testData: WorkflowTestData = {
		description: 'Request URLs for file, conversation, video and response operations',
		input: {
			workflowData: testHarness.readWorkflowJSON('request-urls.workflow.json'),
		},
		output: {
			nodeExecutionOrder: [
				'When clicking ‘Execute workflow’',
				'Delete File',
				'Get Conversation',
				'Update Conversation',
				'Remove Conversation',
				'Generate Video',
				'Message a Model',
			],
			nodeData: {
				'Delete File': [[{ json: deletedFile }]],
				'Get Conversation': [[{ json: conversation }]],
				'Update Conversation': [[{ json: conversation }]],
				'Remove Conversation': [[{ json: deletedConversation }]],
				'Message a Model': [[{ json: { output: [outputMessage] } }]],
			},
		},
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'delete',
					path: `/files/${fileId}`,
					statusCode: 200,
					responseBody: deletedFile,
				},
				{
					method: 'get',
					path: `/conversations/${conversationId}`,
					statusCode: 200,
					responseBody: conversation,
				},
				{
					method: 'post',
					path: `/conversations/${conversationId}`,
					statusCode: 200,
					responseBody: conversation,
				},
				{
					method: 'delete',
					path: `/conversations/${conversationId}`,
					statusCode: 200,
					responseBody: deletedConversation,
				},
				{
					method: 'post',
					path: '/videos',
					statusCode: 200,
					responseBody: { ...video, status: 'queued' },
				},
				{
					method: 'get',
					path: `/videos/${videoId}`,
					statusCode: 200,
					responseBody: video,
				},
				{
					method: 'get',
					path: `/videos/${videoId}/content`,
					statusCode: 200,
					responseBody: 'video-bytes',
					responseHeaders: { 'content-type': 'video/mp4' },
				},
				{
					method: 'post',
					path: '/responses',
					statusCode: 200,
					responseBody: { ...backgroundResponse, status: 'queued', output: [] },
				},
				{
					method: 'get',
					path: `/responses/${responseId}`,
					statusCode: 200,
					responseBody: backgroundResponse,
				},
			],
		},
	};

	testHarness.setupTest(testData, {
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
