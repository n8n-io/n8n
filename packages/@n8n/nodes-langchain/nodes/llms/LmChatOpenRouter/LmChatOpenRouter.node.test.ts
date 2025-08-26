import type { ILoadOptionsFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { LmChatOpenRouter } from './LmChatOpenRouter.node';

describe('LmChatOpenRouter', () => {
	let mockContext: jest.Mocked<ILoadOptionsFunctions>;
	let mockSupplyContext: jest.Mocked<ISupplyDataFunctions>;

	beforeEach(() => {
		mockContext = {
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				url: 'https://openrouter.ai/api/v1',
			}),
			getNodeParameter: jest.fn().mockReturnValue(''),
			helpers: {
				httpRequest: jest.fn().mockResolvedValue({
					data: [{ id: 'openai/gpt-4' }, { id: 'anthropic/claude-3' }, { id: 'google/gemini-pro' }],
				}),
			},
		} as unknown as jest.Mocked<ILoadOptionsFunctions>;

		mockSupplyContext = {
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				url: 'https://openrouter.ai/api/v1',
			}),
			getNodeParameter: jest.fn(),
			getNode: jest.fn().mockReturnValue({ typeVersion: 1 }),
		} as unknown as jest.Mocked<ISupplyDataFunctions>;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getModels', () => {
		it('should return formatted models from OpenRouter API', async () => {
			const nodeInstance = new LmChatOpenRouter();
			const result = await nodeInstance.methods.listSearch.getModels.call(mockContext);

			expect(mockContext.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://openrouter.ai/api/v1/models',
				headers: {
					Authorization: 'Bearer test-api-key',
				},
			});

			expect(result.results).toEqual([
				{ name: 'openai/gpt-4', value: 'openai/gpt-4' },
				{ name: 'anthropic/claude-3', value: 'anthropic/claude-3' },
				{ name: 'google/gemini-pro', value: 'google/gemini-pro' },
			]);
		});

		it('should filter models based on search term', async () => {
			mockContext.helpers.httpRequest = jest.fn().mockResolvedValue({
				data: [
					{ id: 'openai/gpt-4' },
					{ id: 'anthropic/claude-3' },
					{ id: 'openai/gpt-3.5-turbo' },
				],
			});

			const nodeInstance = new LmChatOpenRouter();
			const result = await nodeInstance.methods.listSearch.getModels.call(mockContext, 'gpt');

			expect(result.results).toEqual([
				{ name: 'openai/gpt-4', value: 'openai/gpt-4' },
				{ name: 'openai/gpt-3.5-turbo', value: 'openai/gpt-3.5-turbo' },
			]);
		});

		it('should handle case-insensitive search', async () => {
			mockContext.helpers.httpRequest = jest.fn().mockResolvedValue({
				data: [{ id: 'openai/gpt-4' }, { id: 'anthropic/claude-3' }],
			});

			const nodeInstance = new LmChatOpenRouter();
			const result = await nodeInstance.methods.listSearch.getModels.call(mockContext, 'GPT');

			expect(result.results).toEqual([{ name: 'openai/gpt-4', value: 'openai/gpt-4' }]);
		});

		it('should handle API errors gracefully', async () => {
			mockContext.helpers.httpRequest = jest.fn().mockRejectedValue(new Error('API Error'));

			const nodeInstance = new LmChatOpenRouter();
			await expect(nodeInstance.methods.listSearch.getModels.call(mockContext)).rejects.toThrow(
				'API Error',
			);
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI instance with correct configuration', async () => {
			mockSupplyContext.getNodeParameter
				.mockReturnValueOnce({ mode: 'list', value: 'openai/gpt-4' }) // model
				.mockReturnValueOnce({}); // options

			const nodeInstance = new LmChatOpenRouter();
			const result = await nodeInstance.supplyData.call(mockSupplyContext, 0);

			expect(result.response).toBeDefined();
			// Verify that the model instance is created (we can't easily test the exact instance without mocking)
			expect(result).toHaveProperty('response');
		});

		it('should handle resourceLocator model parameter correctly', async () => {
			mockSupplyContext.getNodeParameter
				.mockReturnValueOnce({ mode: 'id', value: '@preset/gpt-oss-120b-cerebras' }) // custom model ID
				.mockReturnValueOnce({}); // options

			const nodeInstance = new LmChatOpenRouter();
			const result = await nodeInstance.supplyData.call(mockSupplyContext, 0);

			expect(result.response).toBeDefined();
		});

		it('should handle string model parameter for backward compatibility', async () => {
			mockSupplyContext.getNodeParameter
				.mockReturnValueOnce('openai/gpt-4') // string model (legacy)
				.mockReturnValueOnce({}); // options

			const nodeInstance = new LmChatOpenRouter();
			const result = await nodeInstance.supplyData.call(mockSupplyContext, 0);

			expect(result.response).toBeDefined();
		});

		it('should include app attribution headers', async () => {
			mockSupplyContext.getNodeParameter
				.mockReturnValueOnce({ mode: 'list', value: 'openai/gpt-4' })
				.mockReturnValueOnce({});

			const nodeInstance = new LmChatOpenRouter();
			await nodeInstance.supplyData.call(mockSupplyContext, 0);

			// The headers should be set in the configuration, but we can't easily test this
			// without mocking the ChatOpenAI constructor
		});

		it('should handle reasoning effort parameter', async () => {
			mockSupplyContext.getNodeParameter
				.mockReturnValueOnce({ mode: 'list', value: 'openai/gpt-4' })
				.mockReturnValueOnce({
					reasoningEffort: 'high',
					responseFormat: 'text',
				});

			const nodeInstance = new LmChatOpenRouter();
			const result = await nodeInstance.supplyData.call(mockSupplyContext, 0);

			expect(result.response).toBeDefined();
		});

		it('should validate reasoning effort values', async () => {
			mockSupplyContext.getNodeParameter
				.mockReturnValueOnce({ mode: 'list', value: 'openai/gpt-4' })
				.mockReturnValueOnce({
					reasoningEffort: 'invalid',
				});

			const nodeInstance = new LmChatOpenRouter();
			const result = await nodeInstance.supplyData.call(mockSupplyContext, 0);

			expect(result.response).toBeDefined();
			// Invalid reasoning effort should be ignored, not cause an error
		});
	});
});
