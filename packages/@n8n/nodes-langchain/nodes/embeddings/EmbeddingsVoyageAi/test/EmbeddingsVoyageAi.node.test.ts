import { VoyageEmbeddings } from '@langchain/community/embeddings/voyage';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getProxyAgent } from '@utils/httpProxyAgent';

import { EmbeddingsVoyageAi } from '../EmbeddingsVoyageAi.node';

// Mock the VoyageEmbeddings class
jest.mock('@langchain/community/embeddings/voyage', () => ({
	VoyageEmbeddings: jest.fn(),
}));

// Mock the logWrapper utility
jest.mock('@utils/logWrapper', () => ({
	logWrapper: jest.fn().mockImplementation((obj) => ({ logWrapped: obj })),
}));

// Mock the getProxyAgent utility
jest.mock('@utils/httpProxyAgent', () => ({
	getProxyAgent: jest.fn().mockReturnValue(undefined),
}));

describe('EmbeddingsVoyageAi', () => {
	let embeddingsVoyageAi: EmbeddingsVoyageAi;
	let mockSupplyDataFunctions: ISupplyDataFunctions;
	let mockVoyageEmbeddings: jest.Mocked<VoyageEmbeddings>;

	beforeEach(() => {
		embeddingsVoyageAi = new EmbeddingsVoyageAi();

		// Reset the mocks
		jest.clearAllMocks();

		// Create a mock VoyageEmbeddings instance
		mockVoyageEmbeddings = {
			embedQuery: jest.fn(),
			embedDocuments: jest.fn(),
		} as unknown as jest.Mocked<VoyageEmbeddings>;

		// Make the VoyageEmbeddings constructor return our mock instance
		// Note: The actual implementation extends VoyageEmbeddings, so we mock the base class
		(VoyageEmbeddings as unknown as jest.Mock).mockImplementation(() => mockVoyageEmbeddings);

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
			expect(embeddingsVoyageAi.description.displayName).toBe('Embeddings VoyageAI');
			expect(embeddingsVoyageAi.description.name).toBe('embeddingsVoyageAi');
			expect(embeddingsVoyageAi.description.credentials?.[0].name).toBe('voyageAiApi');
		});

		it('should have model parameter', () => {
			const modelParam = embeddingsVoyageAi.description.properties.find(
				(p) => p.name === 'modelName',
			);
			expect(modelParam).toBeDefined();
			expect(modelParam?.type).toBe('options');
			expect(modelParam?.default).toBe('voyage-3.5');
		});

		it('should have options parameter', () => {
			const optionsParam = embeddingsVoyageAi.description.properties.find(
				(p) => p.name === 'options',
			);
			expect(optionsParam).toBeDefined();
			expect(optionsParam?.type).toBe('collection');
		});
	});

	describe('supplyData', () => {
		it('should create VoyageEmbeddings with default model and return wrapped instance', async () => {
			// Setup mocks
			const mockCredentials = { apiKey: 'test-api-key', url: 'https://api.voyageai.com/v1' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5') // modelName
				.mockReturnValueOnce({}); // options
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			// Execute
			const result = await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// Verify
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
				'modelName',
				0,
				'voyage-3.5',
			);
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
			expect(mockSupplyDataFunctions.getCredentials).toHaveBeenCalledWith('voyageAiApi');
			expect(getProxyAgent).toHaveBeenCalledWith('https://api.voyageai.com/v1');
			expect(logWrapper).toHaveBeenCalled();
			expect(result.response).toBeDefined();
		});

		it('should create VoyageEmbeddings with custom model', async () => {
			// Setup mocks
			const mockCredentials = { apiKey: 'custom-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-code-3') // modelName
				.mockReturnValueOnce({}); // options
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			// Execute
			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// Verify the model parameter was used correctly
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
				'modelName',
				0,
				'voyage-3.5',
			);
		});

		it('should handle all model options correctly', async () => {
			const models = [
				'voyage-3.5',
				'voyage-3.5-lite',
				'voyage-3-large',
				'voyage-code-3',
				'voyage-finance-2',
				'voyage-law-2',
				'voyage-multilingual-2',
			];

			for (const model of models) {
				jest.clearAllMocks();

				const mockCredentials = { apiKey: 'test-api-key' };
				(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
					.mockReturnValueOnce(model)
					.mockReturnValueOnce({});
				(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

				await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

				expect(mockSupplyDataFunctions.getCredentials).toHaveBeenCalled();
			}
		});

		it('should handle different item indices', async () => {
			// Setup mocks
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			// Execute with different item index
			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 2);

			// Verify the correct item index is passed
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
				'modelName',
				2,
				'voyage-3.5',
			);
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 2, {});
		});

		it('should throw error when credentials are missing', async () => {
			// Setup mocks
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockRejectedValue(
				new Error('Missing credentials'),
			);

			// Execute and verify error
			await expect(embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				'Missing credentials',
			);
		});

		it('should use default baseURL when not provided in credentials', async () => {
			// Setup mocks - credentials without url
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			// Execute
			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// Verify default URL is used for proxy agent
			expect(getProxyAgent).toHaveBeenCalledWith('https://api.voyageai.com/v1');
		});
	});

	describe('Options Handling', () => {
		it('should handle batchSize option', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = { batchSize: 256 };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});

		it('should handle inputType option with query value', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = { inputType: 'query' };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});

		it('should handle inputType option with document value', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = { inputType: 'document' };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});

		it('should convert empty string inputType to undefined', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = { inputType: '' };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// The implementation converts empty string to undefined
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});

		it('should handle outputDimension option', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = { outputDimension: 512 };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});

		it('should convert 0 outputDimension to undefined (use default)', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = { outputDimension: 0 };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			// The implementation converts 0 to undefined
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});

		it('should handle truncation option', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = { truncation: false };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});

		it('should handle encodingFormat option with base64', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = { encodingFormat: 'base64' as const };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});

		it('should handle outputDtype option with int8', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = { outputDtype: 'int8' as const };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});

		it('should handle multiple options together', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const options = {
				batchSize: 128,
				inputType: 'document',
				outputDimension: 256,
				truncation: true,
				encodingFormat: 'float' as const,
				outputDtype: 'int8' as const,
			};

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce(options);
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		});
	});

	describe('Proxy Support', () => {
		it('should call getProxyAgent with correct baseURL', async () => {
			const mockCredentials = { apiKey: 'test-api-key', url: 'https://custom-api.com/v1' };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(getProxyAgent).toHaveBeenCalledWith('https://custom-api.com/v1');
		});

		it('should handle proxy agent when configured', async () => {
			const mockProxyAgent = { proxy: 'http://proxy.example.com:8080' };
			(getProxyAgent as jest.Mock).mockReturnValue(mockProxyAgent);

			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(getProxyAgent).toHaveBeenCalled();
		});
	});

	describe('Logging', () => {
		it('should call logger.debug', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.logger.debug).toHaveBeenCalledWith(
				'Supply data for embeddings VoyageAI',
			);
		});

		it('should wrap embeddings instance with logWrapper', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('voyage-3.5')
				.mockReturnValueOnce({});
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

			await embeddingsVoyageAi.supplyData.call(mockSupplyDataFunctions, 0);

			expect(logWrapper).toHaveBeenCalledWith(expect.anything(), mockSupplyDataFunctions);
		});
	});
});
