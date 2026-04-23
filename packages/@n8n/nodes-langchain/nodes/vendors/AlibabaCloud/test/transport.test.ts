import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { apiRequest, pollTaskResult } from '../transport';

jest.mock('n8n-workflow', () => {
	const actual = jest.requireActual('n8n-workflow');
	return {
		...actual,
		sleep: jest.fn(),
	};
});

describe('AlicloudModelStudio Transport', () => {
	let mockExecuteFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			apiKey: 'test-key',
			url: 'https://dashscope-intl.aliyuncs.com',
		});
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node-id',
			name: 'Test Node',
			type: '@n8n/n8n-nodes-langchain.alibabaCloud',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('apiRequest', () => {
		it('should call httpRequestWithAuthentication with correct default URL, method, and body', async () => {
			const mockResponse = { output: { text: 'hello' } };
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);

			const result = await apiRequest.call(
				mockExecuteFunctions,
				'POST',
				'/api/v1/services/aigc/text-generation/generation',
				{ body: { model: 'qwen3.5-flash', input: { messages: [] }, parameters: {} } },
			);

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'alibabaCloudApi',
				expect.objectContaining({
					method: 'POST',
					url: 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
					body: { model: 'qwen3.5-flash', input: { messages: [] }, parameters: {} },
					json: true,
				}),
			);
			expect(result).toEqual(mockResponse);
		});

		it('should pass through query string and option parameters', async () => {
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await apiRequest.call(mockExecuteFunctions, 'GET', '/api/v1/tasks/123', {
				qs: { page: 1 },
				option: { timeout: 5000 },
			});

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'alibabaCloudApi',
				expect.objectContaining({
					method: 'GET',
					url: 'https://dashscope-intl.aliyuncs.com/api/v1/tasks/123',
					qs: { page: 1 },
					timeout: 5000,
				}),
			);
		});

		it('should normalize response.error === null to undefined', async () => {
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
				output: { text: 'hello' },
				error: null,
			});

			const result = await apiRequest.call(mockExecuteFunctions, 'POST', '/api/v1/test');

			expect(result.error).toBeUndefined();
		});

		it('should resolve US (Virginia) region to correct base URL', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				url: 'https://dashscope-us.aliyuncs.com',
			});
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await apiRequest.call(mockExecuteFunctions, 'GET', '/api/v1/tasks/123');

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'alibabaCloudApi',
				expect.objectContaining({
					url: 'https://dashscope-us.aliyuncs.com/api/v1/tasks/123',
				}),
			);
		});

		it('should resolve EU (Frankfurt) region with workspaceId to correct base URL', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				url: 'https://ws123.eu-central-1.maas.aliyuncs.com',
			});
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await apiRequest.call(mockExecuteFunctions, 'GET', '/api/v1/tasks/456');

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'alibabaCloudApi',
				expect.objectContaining({
					url: 'https://ws123.eu-central-1.maas.aliyuncs.com/api/v1/tasks/456',
				}),
			);
		});

		it('should use gateway URL when provided via credentials', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiKey: 'gateway-jwt-token',
				url: 'https://gateway.example.com/v1/gateway/alibaba',
			});
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await apiRequest.call(mockExecuteFunctions, 'GET', '/api/v1/tasks/789');

			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'alibabaCloudApi',
				expect.objectContaining({
					url: 'https://gateway.example.com/v1/gateway/alibaba/api/v1/tasks/789',
				}),
			);
		});
	});

	describe('pollTaskResult', () => {
		it('should return response when task status is SUCCEEDED', async () => {
			const succeededResponse = {
				output: { task_status: 'SUCCEEDED', video_url: 'https://example.com/video.mp4' },
				usage: { input_tokens: 10 },
			};
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-key',
				url: 'https://dashscope-intl.aliyuncs.com',
			});
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(
				succeededResponse,
			);

			const result = await pollTaskResult.call(mockExecuteFunctions, 'task-123', 0);

			expect(result).toEqual(succeededResponse);
		});

		it('should throw NodeOperationError when task status is FAILED', async () => {
			const failedResponse = {
				output: {
					task_status: 'FAILED',
					code: 'ModelError',
					message: 'Model inference failed',
				},
			};
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(failedResponse);

			await expect(pollTaskResult.call(mockExecuteFunctions, 'task-456', 0)).rejects.toThrow(
				NodeOperationError,
			);
			await expect(pollTaskResult.call(mockExecuteFunctions, 'task-456', 0)).rejects.toThrow(
				'Task failed: [ModelError] Model inference failed',
			);
		});

		it('should throw NodeOperationError when task status is CANCELED', async () => {
			const canceledResponse = {
				output: { task_status: 'CANCELED' },
			};
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(
				canceledResponse,
			);

			await expect(pollTaskResult.call(mockExecuteFunctions, 'task-789', 0)).rejects.toThrow(
				NodeOperationError,
			);
			await expect(pollTaskResult.call(mockExecuteFunctions, 'task-789', 0)).rejects.toThrow(
				'Video generation task was canceled',
			);
		});

		it('should throw timeout error when max poll attempts exceeded', async () => {
			const pendingResponse = {
				output: { task_status: 'PENDING' },
			};
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(pendingResponse);

			await expect(pollTaskResult.call(mockExecuteFunctions, 'task-timeout', 0)).rejects.toThrow(
				/did not complete within the maximum polling time/,
			);
		});
	});
});
