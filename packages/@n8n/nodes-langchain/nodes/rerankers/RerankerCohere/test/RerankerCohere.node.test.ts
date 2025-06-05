import { CohereRerank } from '@langchain/cohere';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';

import { RerankerCohere } from '../RerankerCohere.node';

// Mock the CohereRerank class
jest.mock('@langchain/cohere', () => ({
	CohereRerank: jest.fn(),
}));

// Mock the logWrapper utility
jest.mock('@utils/logWrapper', () => ({
	logWrapper: jest.fn().mockImplementation((obj) => ({ logWrapped: obj })),
}));

describe('RerankerCohere', () => {
	let rerankerCohere: RerankerCohere;
	let mockSupplyDataFunctions: ISupplyDataFunctions;
	let mockCohereRerank: jest.Mocked<CohereRerank>;

	beforeEach(() => {
		rerankerCohere = new RerankerCohere();

		// Reset the mock
		jest.clearAllMocks();

		// Create a mock CohereRerank instance
		mockCohereRerank = {
			compressDocuments: jest.fn(),
		} as unknown as jest.Mocked<CohereRerank>;

		// Make the CohereRerank constructor return our mock instance
		(CohereRerank as jest.MockedClass<typeof CohereRerank>).mockImplementation(
			() => mockCohereRerank,
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

	it('should create CohereRerank with default model and return wrapped instance', async () => {
		// Setup mocks
		const mockCredentials = { apiKey: 'test-api-key' };
		(mockSupplyDataFunctions.getNodeParameter as jest.Mock).mockReturnValue('rerank-v3.5');
		(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

		// Execute
		const result = await rerankerCohere.supplyData.call(mockSupplyDataFunctions, 0);

		expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
			'modelName',
			0,
			'rerank-v3.5',
		);
		expect(mockSupplyDataFunctions.getCredentials).toHaveBeenCalledWith('cohereApi');
		expect(CohereRerank).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			model: 'rerank-v3.5',
		});
		expect(logWrapper).toHaveBeenCalledWith(mockCohereRerank, mockSupplyDataFunctions);
		expect(result.response).toEqual({ logWrapped: mockCohereRerank });
	});

	it('should create CohereRerank with custom model', async () => {
		// Setup mocks
		const mockCredentials = { apiKey: 'custom-api-key' };
		(mockSupplyDataFunctions.getNodeParameter as jest.Mock).mockReturnValue(
			'rerank-multilingual-v3.0',
		);
		(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

		// Execute
		await rerankerCohere.supplyData.call(mockSupplyDataFunctions, 0);

		// Verify
		expect(CohereRerank).toHaveBeenCalledWith({
			apiKey: 'custom-api-key',
			model: 'rerank-multilingual-v3.0',
		});
	});

	it('should handle different item indices', async () => {
		// Setup mocks
		const mockCredentials = { apiKey: 'test-api-key' };
		(mockSupplyDataFunctions.getNodeParameter as jest.Mock).mockReturnValue('rerank-english-v3.0');
		(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

		// Execute with different item index
		await rerankerCohere.supplyData.call(mockSupplyDataFunctions, 2);

		// Verify the correct item index is passed
		expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
			'modelName',
			2,
			'rerank-v3.5',
		);
	});

	it('should throw error when credentials are missing', async () => {
		// Setup mocks
		(mockSupplyDataFunctions.getNodeParameter as jest.Mock).mockReturnValue('rerank-v3.5');
		(mockSupplyDataFunctions.getCredentials as jest.Mock).mockRejectedValue(
			new Error('Missing credentials'),
		);

		// Execute and verify error
		await expect(rerankerCohere.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
			'Missing credentials',
		);
	});

	it('should use fallback model when parameter is not provided', async () => {
		// Setup mocks - getNodeParameter returns the fallback value
		const mockCredentials = { apiKey: 'test-api-key' };
		(mockSupplyDataFunctions.getNodeParameter as jest.Mock).mockReturnValue('rerank-v3.5'); // fallback value
		(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);

		// Execute
		await rerankerCohere.supplyData.call(mockSupplyDataFunctions, 0);

		// Verify fallback is used
		expect(CohereRerank).toHaveBeenCalledWith({
			apiKey: 'test-api-key',
			model: 'rerank-v3.5',
		});
	});
});
