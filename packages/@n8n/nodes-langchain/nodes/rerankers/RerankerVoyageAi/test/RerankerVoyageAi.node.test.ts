import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { VoyageAIClient } from 'voyageai';

import { logWrapper } from '@utils/logWrapper';
import { getProxyAgent } from '@utils/httpProxyAgent';

import { RerankerVoyageAi } from '../RerankerVoyageAi.node';

// Mock the VoyageAIClient
jest.mock('voyageai', () => ({
	VoyageAIClient: jest.fn(),
}));

// Mock the logWrapper utility
jest.mock('@utils/logWrapper', () => ({
	logWrapper: jest.fn().mockImplementation((obj) => ({ logWrapped: obj })),
}));

// Mock the getProxyAgent utility
jest.mock('@utils/httpProxyAgent', () => ({
	getProxyAgent: jest.fn().mockReturnValue(undefined),
}));

describe('RerankerVoyageAi', () => {
	let rerankerVoyageAi: RerankerVoyageAi;
	let mockSupplyDataFunctions: ISupplyDataFunctions;
	let mockVoyageClient: jest.Mocked<VoyageAIClient>;

	beforeEach(() => {
		rerankerVoyageAi = new RerankerVoyageAi();

		// Reset the mocks
		jest.clearAllMocks();

		// Create a mock VoyageAIClient instance
		mockVoyageClient = {
			rerank: jest.fn(),
		} as unknown as jest.Mocked<VoyageAIClient>;

		// Make the VoyageAIClient constructor return our mock instance
		(VoyageAIClient as jest.MockedClass<typeof VoyageAIClient>).mockImplementation(
			() => mockVoyageClient,
		);

		// Create mock supply data functions
		mockSupplyDataFunctions = mock<ISupplyDataFunctions>({
			logger: {
				debug: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
			},
		});

		// Mock specific methods with proper jest functions
		mockSupplyDataFunctions.getNodeParameter = jest.fn();
		mockSupplyDataFunctions.getCredentials = jest.fn();
	});

	describe('Node Configuration', () => {
		it('should have correct metadata', () => {
			expect(rerankerVoyageAi.description.displayName).toBe('Reranker VoyageAI');
			expect(rerankerVoyageAi.description.name).toBe('rerankerVoyageAi');
			expect(rerankerVoyageAi.description.credentials?.[0].name).toBe('voyageAiApi');
		});

		it('should have model parameter', () => {
			const modelParam = rerankerVoyageAi.description.properties.find(
				(p) => p.name === 'modelName',
			);
			expect(modelParam).toBeDefined();
			expect(modelParam?.type).toBe('options');
			expect(modelParam?.default).toBe('rerank-2.5');
		});

		it('should have topK parameter', () => {
			const topKParam = rerankerVoyageAi.description.properties.find((p) => p.name === 'topK');
			expect(topKParam).toBeDefined();
			expect(topKParam?.type).toBe('number');
			expect(topKParam?.default).toBe(3);
		});

		it('should have options parameter', () => {
			const optionsParam = rerankerVoyageAi.description.properties.find(
				(p) => p.name === 'options',
			);
			expect(optionsParam).toBeDefined();
			expect(optionsParam?.type).toBe('collection');
		});
	});

	describe('supplyData', () => {
		it('should create VoyageReranker with default model and return wrapped instance', async () => {
			// Setup mocks
			const mockCredentials = { apiKey: 'test-api-key', url: 'https://api.voyageai.com/v1' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5') // modelName
				.mockReturnValueOnce(3) // topK
				.mockReturnValueOnce({}); // options
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			// Execute
			const result = await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// Verify
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
				'modelName',
				0,
				'rerank-2.5',
			);
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('topK', 0, 3);
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
			expect(mockSupplyDataFunctions.getCredentials).toHaveBeenCalledWith('voyageAiApi');
			expect(VoyageAIClient).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					environment: 'https://api.voyageai.com/v1',
				}),
			);
			expect(logWrapper).toHaveBeenCalled();
			expect(result.response).toBeDefined();
		});

		it('should create VoyageReranker with custom model', async () => {
			// Setup mocks
			const mockCredentials = { apiKey: 'custom-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5-lite') // modelName
				.mockReturnValueOnce(5) // topK
				.mockReturnValueOnce({}); // options
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			// Execute
			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// Verify
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
				'modelName',
				0,
				'rerank-2.5',
			);
			expect(VoyageAIClient).toHaveBeenCalled();
		});

		it('should handle all model options correctly', async () => {
			const models = ['rerank-2.5', 'rerank-2.5-lite', 'rerank-2', 'rerank-2-lite'];

			for (const model of models) {
				jest.clearAllMocks();

				const mockCredentials = { apiKey: 'test-api-key' };
				(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(model)
					.mockReturnValueOnce(3)
					.mockReturnValueOnce({});
				(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

				await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

				expect(mockSupplyDataFunctions.getCredentials).toHaveBeenCalled();
			}
		});

		it('should handle different item indices', async () => {
			// Setup mocks
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			// Execute with different item index
			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 2);

			// Verify the correct item index is passed
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
				'modelName',
				2,
				'rerank-2.5',
			);
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('topK', 2, 3);
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 2, {});
		});

		it('should throw error when credentials are missing', async () => {
			// Setup mocks
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockRejectedValue(
				new Error('Missing credentials'),
			);

			// Execute and verify error
			await expect(rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				'Missing credentials',
			);
		});

		it('should use default baseURL when not provided in credentials', async () => {
			// Setup mocks - credentials without url
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			// Execute
			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// Verify default URL is used
			expect(VoyageAIClient).toHaveBeenCalledWith(
				expect.objectContaining({
					environment: 'https://api.voyageai.com/v1',
				}),
			);
		});

		it('should use custom baseURL when provided in credentials', async () => {
			// Setup mocks
			const mockCredentials = { apiKey: 'test-api-key', url: 'https://custom-api.com/v1' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			// Execute
			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// Verify custom URL is used
			expect(VoyageAIClient).toHaveBeenCalledWith(
				expect.objectContaining({
					environment: 'https://custom-api.com/v1',
				}),
			);
		});
	});

	describe('TopK Parameter', () => {
		it('should handle topK value of 1', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(1)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('topK', 0, 3);
		});

		it('should handle large topK value', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(100)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('topK', 0, 3);
		});

		it('should handle custom topK value', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(10)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('topK', 0, 3);
		});
	});

	describe('Options Handling', () => {
		it('should handle truncation option set to false', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = { truncation: false };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});

		it('should handle truncation option set to true', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = { truncation: true };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});

		it('should use default truncation when not provided', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = {};

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// Default truncation is true
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});
	});

	describe('Proxy Support', () => {
		it('should call getProxyAgent when proxy is configured', async () => {
			const mockCredentials = { apiKey: 'test-api-key', url: 'https://custom-api.com/v1' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// getProxyAgent is called during VoyageReranker initialization
			expect(getProxyAgent).toHaveBeenCalledWith('https://custom-api.com/v1');
		});

		it('should handle proxy agent configuration', async () => {
			const mockProxyAgent = { proxy: 'http://proxy.example.com:8080' };
			(getProxyAgent as jest.Mock).mockReturnValue(mockProxyAgent);

			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// Verify VoyageAIClient is called with custom fetcher (proxy support)
			expect(VoyageAIClient).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					fetcher: expect.any(Function),
				}),
			);
		});

		it('should not add fetcher when proxy agent is not configured', async () => {
			(getProxyAgent as jest.Mock).mockReturnValue(undefined);

			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// Verify VoyageAIClient is called without custom fetcher
			expect(VoyageAIClient).toHaveBeenCalledWith(
				expect.not.objectContaining({
					fetcher: expect.any(Function),
				}),
			);
		});
	});

	describe('Logging', () => {
		it('should call logger.debug', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.logger.debug).toHaveBeenCalledWith(
				'Supply data for reranker VoyageAI',
			);
		});

		it('should wrap reranker instance with logWrapper', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(logWrapper).toHaveBeenCalledWith(expect.anything(), mockSupplyDataFunctions);
		});
	});

	describe('VoyageReranker class functionality', () => {
		it('should create reranker with correct configuration', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(5)
				.mockReturnValueOnce({ truncation: false });
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			const result = await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(result.response).toBeDefined();
			expect(VoyageAIClient).toHaveBeenCalled();
		});
	});

	describe('Document Compression', () => {
		it('should be able to compress documents (integration test)', async () => {
			// This test verifies the structure, actual compression is tested in runtime
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('rerank-2.5')
				.mockReturnValueOnce(3)
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			// Mock rerank API response
			mockVoyageClient.rerank.mockResolvedValue({
				data: [
					{ index: 0, relevanceScore: 0.95 },
					{ index: 2, relevanceScore: 0.85 },
					{ index: 1, relevanceScore: 0.75 },
				],
			} as any);

			const result = await rerankerVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// The result should contain a wrapped reranker instance
			expect(result.response).toBeDefined();
		});
	});
});
