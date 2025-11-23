import type { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import { VectorStore } from '@langchain/core/vectorstores';
import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { RetrieverVectorStore } from '../RetrieverVectorStore.node';

const mockLogger = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

describe('RetrieverVectorStore', () => {
	let retrieverNode: RetrieverVectorStore;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	beforeEach(() => {
		retrieverNode = new RetrieverVectorStore();
		mockContext = {
			logger: mockLogger,
			getNodeParameter: jest.fn(),
			getInputConnectionData: jest.fn(),
		} as unknown as jest.Mocked<ISupplyDataFunctions>;
		jest.clearAllMocks();
	});

	describe('supplyData', () => {
		it('should create a retriever from a basic VectorStore', async () => {
			const mockVectorStore = Object.create(VectorStore.prototype) as VectorStore;
			mockVectorStore.asRetriever = jest.fn().mockReturnValue({ test: 'retriever' });

			mockContext.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'topK') return 4;
				return defaultValue;
			});

			mockContext.getInputConnectionData.mockResolvedValue(mockVectorStore);

			const result = await retrieverNode.supplyData.call(mockContext, 0);

			expect(mockContext.getInputConnectionData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiVectorStore,
				0,
			);
			expect(mockVectorStore.asRetriever).toHaveBeenCalledWith(4);
			expect(result).toHaveProperty('response', { test: 'retriever' });
		});

		it('should create a retriever with custom topK parameter', async () => {
			const mockVectorStore = Object.create(VectorStore.prototype) as VectorStore;
			mockVectorStore.asRetriever = jest.fn().mockReturnValue({ test: 'retriever' });

			mockContext.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'topK') return 10;
				return defaultValue;
			});
			mockContext.getInputConnectionData.mockResolvedValue(mockVectorStore);

			const result = await retrieverNode.supplyData.call(mockContext, 0);

			expect(mockVectorStore.asRetriever).toHaveBeenCalledWith(10);
			expect(result).toHaveProperty('response', { test: 'retriever' });
		});

		it('should create a ContextualCompressionRetriever when input contains reranker and vectorStore', async () => {
			const mockVectorStore = Object.create(VectorStore.prototype) as VectorStore;
			mockVectorStore.asRetriever = jest.fn().mockReturnValue({ test: 'base-retriever' });

			const mockReranker = {} as BaseDocumentCompressor;

			const inputWithReranker = {
				reranker: mockReranker,
				vectorStore: mockVectorStore,
			};

			mockContext.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'topK') return 4;
				return defaultValue;
			});
			mockContext.getInputConnectionData.mockResolvedValue(inputWithReranker);

			const result = await retrieverNode.supplyData.call(mockContext, 0);

			expect(mockContext.getInputConnectionData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiVectorStore,
				0,
			);
			expect(mockVectorStore.asRetriever).toHaveBeenCalledWith(4);
			expect(result.response).toBeInstanceOf(ContextualCompressionRetriever);
		});

		it('should create a ContextualCompressionRetriever with custom topK when using reranker', async () => {
			const mockVectorStore = Object.create(VectorStore.prototype) as VectorStore;
			mockVectorStore.asRetriever = jest.fn().mockReturnValue({ test: 'base-retriever' });

			const mockReranker = {} as BaseDocumentCompressor;

			const inputWithReranker = {
				reranker: mockReranker,
				vectorStore: mockVectorStore,
			};

			mockContext.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'topK') return 8;
				return defaultValue;
			});
			mockContext.getInputConnectionData.mockResolvedValue(inputWithReranker);

			const result = await retrieverNode.supplyData.call(mockContext, 0);

			expect(mockVectorStore.asRetriever).toHaveBeenCalledWith(8);
			expect(result.response).toBeInstanceOf(ContextualCompressionRetriever);
		});

		it('should use default topK value when parameter is not provided', async () => {
			const mockVectorStore = Object.create(VectorStore.prototype) as VectorStore;
			mockVectorStore.asRetriever = jest.fn().mockReturnValue({ test: 'retriever' });

			mockContext.getNodeParameter.mockImplementation((_param, _itemIndex, defaultValue) => {
				return defaultValue;
			});
			mockContext.getInputConnectionData.mockResolvedValue(mockVectorStore);

			await retrieverNode.supplyData.call(mockContext, 0);

			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('topK', 0, 4);
			expect(mockVectorStore.asRetriever).toHaveBeenCalledWith(4);
		});
	});
});
