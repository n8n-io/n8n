import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { apiRequest, pollVideoTask, getVideoDownloadUrl } from '../transport';

jest.mock('n8n-workflow', () => {
	const actual = jest.requireActual('n8n-workflow');
	return {
		...actual,
		sleep: jest.fn(),
	};
});

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
		jest.clearAllMocks();
	});

	describe('apiRequest', () => {
		it('should call httpRequestWithAuthentication with correct URL, method, and body', async () => {
			const mockResponse = { choices: [{ message: { content: 'hello' } }] };
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);

			const result = await apiRequest.call(mockExecuteFunctions, 'POST', '/chat/completions', {
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

			await apiRequest.call(mockExecuteFunctions, 'GET', '/query/video_generation', {
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

			await apiRequest.call(mockExecuteFunctions, 'GET', '/files/retrieve');

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'minimaxApi',
				expect.objectContaining({
					url: 'https://api.minimaxi.com/v1/files/retrieve',
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
