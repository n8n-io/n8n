import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	apiRequest,
	generateVideo,
	pollVideoTask,
	pollVideoTaskV2,
	getVideoDownloadUrl,
} from '../transport';

vi.mock('@n8n/utils/sleep', () => ({
	sleep: vi.fn(),
}));

describe('MiniMax Transport', () => {
	let mockExecuteFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			apiKey: 'test-key',
			url: 'https://api.minimax.io/v1',
		});
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node-id',
			name: 'Test Node',
			type: '@n8n/n8n-nodes-langchain.minimax',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('apiRequest', () => {
		it('should call httpRequestWithAuthentication with correct URL, method, and body', async () => {
			const mockResponse = { choices: [{ message: { content: 'hello' } }] };
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);

			const result = await apiRequest.call(mockExecuteFunctions, 'POST', '/v1/chat/completions', {
				body: { model: 'MiniMax-M2.7', messages: [] },
			});

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'minimaxApi',
				expect.objectContaining({
					method: 'POST',
					url: 'https://api.minimax.io/v1/chat/completions',
					body: { model: 'MiniMax-M2.7', messages: [] },
					json: true,
				}),
			);
			expect(result).toEqual(mockResponse);
		});

		it('should pass through query string parameters', async () => {
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await apiRequest.call(mockExecuteFunctions, 'GET', '/v1/query/video_generation', {
				qs: { task_id: 'task-123' },
			});

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'minimaxApi',
				expect.objectContaining({
					method: 'GET',
					url: 'https://api.minimax.io/v1/query/video_generation',
					qs: { task_id: 'task-123' },
				}),
			);
		});

		it('should resolve China region to correct base URL', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				url: 'https://api.minimaxi.com/v1',
			});
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await apiRequest.call(mockExecuteFunctions, 'GET', '/v1/files/retrieve');

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'minimaxApi',
				expect.objectContaining({
					url: 'https://api.minimaxi.com/v1/files/retrieve',
				}),
			);
		});
	});

	describe('versioned API URLs', () => {
		it.each([
			['https://api.minimax.io/v1', 'https://api.minimax.io/v2/video_generation'],
			['https://api.minimaxi.com/v1', 'https://api.minimaxi.com/v2/video_generation'],
		])('should derive the V2 URL from %s', async (credentialUrl, expectedUrl) => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				url: credentialUrl,
			});
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await apiRequest.call(mockExecuteFunctions, 'POST', '/v2/video_generation', {
				body: { model: 'MiniMax-H3' },
			});

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'minimaxApi',
				expect.objectContaining({
					method: 'POST',
					url: expectedUrl,
					body: { model: 'MiniMax-H3' },
				}),
			);
		});
	});

	describe('pollVideoTask', () => {
		it('should return fileId when task status is Success', async () => {
			const succeededResponse = {
				status: 'Success',
				file_id: 'file-abc-123',
			};
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(
				succeededResponse,
			);

			const result = await pollVideoTask.call(mockExecuteFunctions, 'task-123', 0);

			expect(result).toEqual({ fileId: 'file-abc-123', status: 'Success' });
		});

		it('should throw NodeOperationError when task status is Fail', async () => {
			const failedResponse = {
				status: 'Fail',
				base_resp: {
					status_code: 'CONTENT_MODERATION',
					status_msg: 'Content moderation failed',
				},
			};
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(failedResponse);

			await expect(pollVideoTask.call(mockExecuteFunctions, 'task-456', 0)).rejects.toThrow(
				NodeOperationError,
			);
			await expect(pollVideoTask.call(mockExecuteFunctions, 'task-456', 0)).rejects.toThrow(
				'Task failed',
			);
		});

		it('should throw timeout error when max poll attempts exceeded', async () => {
			const pendingResponse = {
				status: 'Processing',
			};
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(pendingResponse);

			await expect(pollVideoTask.call(mockExecuteFunctions, 'task-timeout', 0)).rejects.toThrow(
				/did not complete within the maximum polling time/,
			);
		});
	});

	describe('pollVideoTaskV2', () => {
		it('should return video URL when task status is succeeded', async () => {
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
				task: {
					status: 'succeeded',
					content: { url: 'https://cdn.minimax.io/videos/h3.mp4' },
				},
			});

			const result = await pollVideoTaskV2.call(mockExecuteFunctions, 'task-h3', 0);

			expect(result).toEqual({
				videoUrl: 'https://cdn.minimax.io/videos/h3.mp4',
				status: 'succeeded',
			});
			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'minimaxApi',
				expect.objectContaining({
					method: 'GET',
					url: 'https://api.minimax.io/v2/query/video_generation/task-h3',
				}),
			);
		});

		it('should throw NodeOperationError when task status is failed', async () => {
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
				task: {
					status: 'failed',
					error: { code: '1026', message: 'Content rejected' },
				},
			});

			await expect(pollVideoTaskV2.call(mockExecuteFunctions, 'task-h3', 0)).rejects.toThrow(
				'Task failed: [1026] Content rejected',
			);
		});

		it('should stop polling when execution is cancelled', async () => {
			const abortController = new AbortController();
			abortController.abort();
			mockExecuteFunctions.getExecutionCancelSignal.mockReturnValue(abortController.signal);

			await expect(pollVideoTaskV2.call(mockExecuteFunctions, 'task-h3', 0)).rejects.toThrow();
			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should throw timeout error when max poll attempts are exceeded', async () => {
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
				task: { status: 'running' },
			});

			await expect(pollVideoTaskV2.call(mockExecuteFunctions, 'task-timeout', 0)).rejects.toThrow(
				/did not complete within the maximum polling time/,
			);
		});
	});

	describe('generateVideo', () => {
		it('should create and resolve a V2 video task', async () => {
			mockExecuteFunctions.helpers.httpRequestWithAuthentication
				.mockResolvedValueOnce({ task_id: 'task-h3' })
				.mockResolvedValueOnce({
					task: {
						status: 'succeeded',
						content: { url: 'https://cdn.minimax.io/videos/h3.mp4' },
					},
				});

			const result = await generateVideo.call(mockExecuteFunctions, 'v2', {
				model: 'MiniMax-H3',
			});

			expect(result).toEqual({
				videoUrl: 'https://cdn.minimax.io/videos/h3.mp4',
				taskId: 'task-h3',
			});
		});

		it('should preserve the V1 file ID output', async () => {
			mockExecuteFunctions.helpers.httpRequestWithAuthentication
				.mockResolvedValueOnce({
					task_id: 'task-v1',
					base_resp: { status_code: 0, status_msg: 'success' },
				})
				.mockResolvedValueOnce({ status: 'Success', file_id: 'file-v1' })
				.mockResolvedValueOnce({
					file: { download_url: 'https://cdn.minimax.io/videos/v1.mp4' },
				});

			const result = await generateVideo.call(mockExecuteFunctions, 'v1', {
				model: 'MiniMax-Hailuo-2.3',
			});

			expect(result).toEqual({
				videoUrl: 'https://cdn.minimax.io/videos/v1.mp4',
				taskId: 'task-v1',
				fileId: 'file-v1',
			});
		});
	});

	describe('getVideoDownloadUrl', () => {
		it('should return download URL from file retrieval response', async () => {
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
				file: {
					download_url: 'https://cdn.minimax.io/videos/abc.mp4',
				},
			});

			const result = await getVideoDownloadUrl.call(mockExecuteFunctions, 'file-abc');

			expect(result).toBe('https://cdn.minimax.io/videos/abc.mp4');
		});

		it('should throw NodeOperationError when download URL is missing', async () => {
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
				file: {},
			});

			await expect(getVideoDownloadUrl.call(mockExecuteFunctions, 'file-missing')).rejects.toThrow(
				NodeOperationError,
			);
		});
	});
});
