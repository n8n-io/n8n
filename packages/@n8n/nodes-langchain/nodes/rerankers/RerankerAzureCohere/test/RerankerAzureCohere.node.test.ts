import type { DocumentInterface } from '@langchain/core/documents';
import { mock } from 'jest-mock-extended';
import { CohereClientV2 } from 'cohere-ai';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { logWrapper } from '@n8n/ai-utilities';

import { RerankerAzureCohere } from '../RerankerAzureCohere.node';

jest.mock('cohere-ai', () => ({
	CohereClientV2: jest.fn(),
}));

jest.mock('@n8n/ai-utilities', () => ({
	logWrapper: jest.fn().mockImplementation((obj) => ({ logWrapped: obj })),
}));

type RerankerCompressor = {
	compressDocuments: (
		documents: Array<DocumentInterface>,
		query: string,
	) => Promise<Array<DocumentInterface>>;
};

describe('RerankerAzureCohere', () => {
	let rerankerAzureCohere: RerankerAzureCohere;
	let mockSupplyDataFunctions: ISupplyDataFunctions;
	let mockRerank: jest.Mock;

	beforeEach(() => {
		rerankerAzureCohere = new RerankerAzureCohere();

		jest.clearAllMocks();

		mockRerank = jest.fn();
		(CohereClientV2 as unknown as jest.Mock).mockImplementation(() => ({
			rerank: mockRerank,
		}));

		mockSupplyDataFunctions = mock<ISupplyDataFunctions>({
			logger: {
				debug: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
			},
		});

		mockSupplyDataFunctions.getNodeParameter = jest.fn();
		mockSupplyDataFunctions.getCredentials = jest.fn();
	});

	async function createCompressor(
		itemIndex: number,
		credentials: { apiKey: string; baseUrl: string },
		modelName = 'rerank-v3.5',
		topN = 3,
	): Promise<RerankerCompressor> {
		(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
			.mockReturnValueOnce(modelName)
			.mockReturnValueOnce(topN);
		(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(credentials);

		const result = await rerankerAzureCohere.supplyData.call(mockSupplyDataFunctions, itemIndex);
		return (result.response as { logWrapped: RerankerCompressor }).logWrapped;
	}

	it('should create reranker with normalized base URL and return wrapped instance', async () => {
		const credentials = {
			apiKey: 'test-api-key',
			baseUrl: 'https://test-resource.services.ai.azure.com',
		};

		const result = await createCompressor(0, credentials);

		expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
			'modelName',
			0,
			'rerank-v3.5',
		);
		expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('topN', 0, 3);
		expect(mockSupplyDataFunctions.getCredentials).toHaveBeenCalledWith('azureCohereRerankApi');
		expect(CohereClientV2).toHaveBeenCalledWith({
			token: 'test-api-key',
			environment: 'https://test-resource.services.ai.azure.com/providers/cohere',
		});
		expect(logWrapper).toHaveBeenCalledWith(result, mockSupplyDataFunctions);
	});

	it('should normalize base URL with providers/cohere/v2/rerank suffix', async () => {
		await createCompressor(0, {
			apiKey: 'test-api-key',
			baseUrl: 'https://test-resource.services.ai.azure.com/providers/cohere/v2/rerank/',
		});

		expect(CohereClientV2).toHaveBeenCalledWith({
			token: 'test-api-key',
			environment: 'https://test-resource.services.ai.azure.com/providers/cohere',
		});
	});

	it('should handle different item indices', async () => {
		await createCompressor(
			2,
			{
				apiKey: 'test-api-key',
				baseUrl: 'https://test-resource.services.ai.azure.com',
			},
			'rerank-multilingual-v3.0',
			5,
		);

		expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
			'modelName',
			2,
			'rerank-v3.5',
		);
		expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('topN', 2, 3);
	});

	it('should throw error when credentials are missing', async () => {
		(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
			.mockReturnValueOnce('rerank-v3.5')
			.mockReturnValueOnce(3);
		(mockSupplyDataFunctions.getCredentials as jest.Mock).mockRejectedValue(
			new Error('Missing credentials'),
		);

		await expect(rerankerAzureCohere.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
			'Missing credentials',
		);
	});

	it('should throw error when base URL is invalid', async () => {
		await expect(
			createCompressor(0, {
				apiKey: 'test-api-key',
				baseUrl: 'invalid-url',
			}),
		).rejects.toThrow();
	});

	it('should rerank documents and attach relevance score metadata', async () => {
		mockRerank.mockResolvedValue({
			results: [
				{ index: 1, relevanceScore: 0.91 },
				{ index: 0, relevanceScore: 0.37 },
			],
		});

		const compressor = await createCompressor(0, {
			apiKey: 'test-api-key',
			baseUrl: 'https://test-resource.services.ai.azure.com',
		});

		const documents: Array<DocumentInterface> = [
			{ pageContent: 'doc-one', metadata: { source: 'a' } } as DocumentInterface,
			{ pageContent: 'doc-two', metadata: { source: 'b' } } as DocumentInterface,
		];

		const result = await compressor.compressDocuments(documents, 'query');

		expect(mockRerank).toHaveBeenCalledWith({
			model: 'rerank-v3.5',
			query: 'query',
			documents: ['doc-one', 'doc-two'],
			topN: 2,
		});
		expect(result).toHaveLength(2);
		expect(result[0]).toBe(documents[1]);
		expect(result[1]).toBe(documents[0]);
		expect(result[0].metadata.relevanceScore).toBe(0.91);
		expect(result[1].metadata.relevanceScore).toBe(0.37);
	});

	it('should clamp topN to at least 1 and fallback when no results are returned', async () => {
		mockRerank.mockResolvedValue({ results: [] });

		const compressor = await createCompressor(
			0,
			{
				apiKey: 'test-api-key',
				baseUrl: 'https://test-resource.services.ai.azure.com',
			},
			'rerank-v3.5',
			0,
		);

		const documents: Array<DocumentInterface> = [
			{ pageContent: 'doc-one', metadata: {} } as DocumentInterface,
			{ pageContent: 'doc-two', metadata: {} } as DocumentInterface,
		];

		const result = await compressor.compressDocuments(documents, 'query');

		expect(mockRerank).toHaveBeenCalledWith({
			model: 'rerank-v3.5',
			query: 'query',
			documents: ['doc-one', 'doc-two'],
			topN: 1,
		});
		expect(result).toEqual([documents[0]]);
	});

	it('should return empty array for empty input without calling rerank', async () => {
		const compressor = await createCompressor(0, {
			apiKey: 'test-api-key',
			baseUrl: 'https://test-resource.services.ai.azure.com',
		});

		const result = await compressor.compressDocuments([], 'query');

		expect(result).toEqual([]);
		expect(mockRerank).not.toHaveBeenCalled();
	});

	it('should throw descriptive error when rerank API request fails', async () => {
		mockRerank.mockRejectedValue(new Error('Boom'));

		const compressor = await createCompressor(0, {
			apiKey: 'test-api-key',
			baseUrl: 'https://test-resource.services.ai.azure.com',
		});

		const documents: Array<DocumentInterface> = [
			{ pageContent: 'doc-one', metadata: {} } as DocumentInterface,
		];

		await expect(compressor.compressDocuments(documents, 'query')).rejects.toThrow(
			'Azure Cohere rerank request failed: Boom',
		);
	});
});
