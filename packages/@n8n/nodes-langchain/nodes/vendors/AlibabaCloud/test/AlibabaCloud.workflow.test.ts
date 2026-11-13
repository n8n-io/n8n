import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
import type { WorkflowTestData } from 'n8n-workflow';
import path from 'node:path';

describe('Qwen Cloud Workflow', () => {
	const baseUrl = 'https://dashscope-intl.aliyuncs.com';
	const credentials = {
		alibabaCloudApi: { apiKey: 'test-key', region: 'ap-southeast-1', url: baseUrl },
	};

	const testHarness = new NodeTestHarness({
		additionalPackagePaths: [path.dirname(require.resolve('n8n-nodes-base'))],
	});

	const imageTaskId = '0385dc79-5ff8-4d82-bcb6-ec3b5d5e3a11';
	const t2vTaskId = '5b2f9c1e-8a47-4d3b-9e61-2c7d0a4f8b22';
	const i2vTaskId = 'a8e3d6f0-1b2c-4e5d-8f9a-3b4c5d6e7f33';
	const imageUrl = 'https://dashscope-result.oss-ap-southeast-1.aliyuncs.com/image.png';
	const t2vVideoUrl = 'https://dashscope-result.oss-ap-southeast-1.aliyuncs.com/t2v.mp4';
	const i2vVideoUrl = 'https://dashscope-result.oss-ap-southeast-1.aliyuncs.com/i2v.mp4';
	const imageUsage = { image_count: 1 };

	const multimodalResponse = (text: string) => ({
		output: {
			choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: [{ text }] } }],
		},
		usage: { input_tokens: 10, output_tokens: 8 },
		request_id: 'e5d6c7b8-a9f0-4e1d-8c2b-3a4f5e6d7c8b',
	});

	const asyncTask = (taskId: string) => ({
		output: { task_id: taskId, task_status: 'PENDING' },
		request_id: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
	});

	const testData: WorkflowTestData = {
		description: 'Request URLs for text, image and video operations',
		input: {
			workflowData: testHarness.readWorkflowJSON('request-urls.workflow.json'),
		},
		output: {
			nodeExecutionOrder: [
				'When clicking ‘Execute workflow’',
				'Message a Model',
				'Analyze Image',
				'Generate Image',
				'Text to Video',
				'Image to Video',
			],
			nodeData: {
				'Message a Model': [[{ json: { content: 'Hello! How can I help?' } }]],
				'Analyze Image': [[{ json: { content: 'A cat on a sofa.' } }]],
				'Generate Image': [[{ json: { model: 'wan2.6-t2i', imageUrl, usage: imageUsage } }]],
				'Text to Video': [[{ json: { videoUrl: t2vVideoUrl } }]],
				'Image to Video': [[{ json: { videoUrl: i2vVideoUrl } }]],
			},
		},
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'post',
					path: '/api/v1/services/aigc/multimodal-generation/generation',
					statusCode: 200,
					responseBody: multimodalResponse('Hello! How can I help?'),
				},
				{
					method: 'post',
					path: '/api/v1/services/aigc/multimodal-generation/generation',
					statusCode: 200,
					responseBody: multimodalResponse('A cat on a sofa.'),
				},
				{
					method: 'post',
					path: '/api/v1/services/aigc/image-generation/generation',
					statusCode: 200,
					responseBody: asyncTask(imageTaskId),
				},
				{
					method: 'get',
					path: `/api/v1/tasks/${imageTaskId}`,
					statusCode: 200,
					responseBody: {
						output: {
							task_id: imageTaskId,
							task_status: 'SUCCEEDED',
							choices: [{ message: { role: 'assistant', content: [{ image: imageUrl }] } }],
						},
						usage: imageUsage,
					},
				},
				{
					method: 'post',
					path: '/api/v1/services/aigc/video-generation/video-synthesis',
					statusCode: 200,
					responseBody: asyncTask(t2vTaskId),
				},
				{
					method: 'get',
					path: `/api/v1/tasks/${t2vTaskId}`,
					statusCode: 200,
					responseBody: {
						output: { task_id: t2vTaskId, task_status: 'SUCCEEDED', video_url: t2vVideoUrl },
					},
				},
				{
					method: 'post',
					path: '/api/v1/services/aigc/video-generation/video-synthesis',
					statusCode: 200,
					responseBody: asyncTask(i2vTaskId),
				},
				{
					method: 'get',
					path: `/api/v1/tasks/${i2vTaskId}`,
					statusCode: 200,
					responseBody: {
						output: { task_id: i2vTaskId, task_status: 'SUCCEEDED', video_url: i2vVideoUrl },
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
