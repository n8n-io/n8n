import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';
import type { WorkflowTestData } from 'n8n-workflow';
import path from 'node:path';

describe('MiniMax Workflow', () => {
	const baseUrl = 'https://api.minimax.io';
	const credentials = {
		minimaxApi: { apiKey: 'test-key', region: 'international', url: `${baseUrl}/v1` },
	};

	const testHarness = new NodeTestHarness({
		additionalPackagePaths: [path.dirname(require.resolve('n8n-nodes-base'))],
	});

	const v2TaskId = 'cgt-20260415103000-abcde';
	const v1TaskId = '106916112212032';
	const fileId = '205258526306433';
	const v2VideoUrl = 'https://cdn.minimax.io/video/cgt-20260415103000-abcde.mp4';
	const v1VideoUrl = 'https://cdn.minimax.io/video/205258526306433.mp4';

	const testData: WorkflowTestData = {
		description: 'Request URLs for message and video operations',
		input: {
			workflowData: testHarness.readWorkflowJSON('request-urls.workflow.json'),
		},
		output: {
			nodeExecutionOrder: [
				'When clicking ‘Execute workflow’',
				'Message a Model',
				'Generate Video V2',
				'Generate Video V1',
			],
			nodeData: {
				'Message a Model': [[{ json: { content: 'Waves fold into foam' } }]],
				'Generate Video V2': [[{ json: { videoUrl: v2VideoUrl, taskId: v2TaskId } }]],
				'Generate Video V1': [[{ json: { videoUrl: v1VideoUrl, taskId: v1TaskId, fileId } }]],
			},
		},
		nock: {
			baseUrl,
			mocks: [
				{
					method: 'post',
					path: '/v1/chat/completions',
					statusCode: 200,
					responseBody: {
						id: '0512d2e2f1c0a1b2c3d4e5f6',
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
				{
					method: 'post',
					path: '/v2/video_generation',
					statusCode: 200,
					responseBody: { task_id: v2TaskId },
				},
				{
					method: 'get',
					path: `/v2/query/video_generation/${v2TaskId}`,
					statusCode: 200,
					responseBody: {
						task: { id: v2TaskId, status: 'succeeded', content: { url: v2VideoUrl } },
					},
				},
				{
					method: 'post',
					path: '/v1/video_generation',
					statusCode: 200,
					responseBody: { task_id: v1TaskId, base_resp: { status_code: 0, status_msg: 'success' } },
				},
				{
					method: 'get',
					path: `/v1/query/video_generation?task_id=${v1TaskId}`,
					statusCode: 200,
					responseBody: { task_id: v1TaskId, status: 'Success', file_id: fileId },
				},
				{
					method: 'get',
					path: `/v1/files/retrieve?file_id=${fileId}`,
					statusCode: 200,
					responseBody: { file: { file_id: fileId, download_url: v1VideoUrl } },
				},
			],
		},
	};

	testHarness.setupTest(testData, {
		credentials,
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
