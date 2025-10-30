import type { Embeddings } from '@langchain/core/embeddings';
import type { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';

import type { VectorStoreNodeConstructorArgs } from '../../types';
import { handleRetrieveOperation } from '../retrieveOperation';

// Mock helper functions
jest.mock('@utils/helpers', () => ({
	getMetadataFiltersValues: jest.fn().mockReturnValue({ testFilter: 'value' }),
}));

jest.mock('@utils/logWrapper', () => ({
	logWrapper: jest.fn().mockImplementation((obj) => obj),
}));

describe('handleRetrieveOperation', () => {
	let mockContext: MockProxy<ISupplyDataFunctions>;
	let mockEmbeddings: MockProxy<Embeddings>;
	let mockVectorStore: MockProxy<VectorStore>;
	let mockReranker: MockProxy<BaseDocumentCompressor>;
	let mockArgs: VectorStoreNodeConstructorArgs<VectorStore>;

	beforeEach(() => {
		mockContext = mock<ISupplyDataFunctions>();
		mockContext.getNodeParameter.mockReturnValue(false); // Default useReranker to false

		mockEmbeddings = mock<Embeddings>();

		mockVectorStore = mock<VectorStore>();

		mockReranker = mock<BaseDocumentCompressor>();

		mockArgs = {
			meta: {
				displayName: 'Test Vector Store',
				name: 'testVectorStore',
				description: 'Vector store for testing',
				docsUrl: 'https://example.com',
				icon: 'file:testIcon.svg',
			},
			sharedFields: [],
			getVectorStoreClient: jest.fn().mockResolvedValue(mockVectorStore),
			populateVectorStore: jest.fn().mockResolvedValue(undefined),
			releaseVectorStoreClient: jest.fn(),
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should retrieve vector store with metadata filters', async () => {
		const result = await handleRetrieveOperation(mockContext, mockArgs, mockEmbeddings, 0);

		// Should get vector store client with filters
		expect(mockArgs.getVectorStoreClient).toHaveBeenCalledWith(
			mockContext,
			{ testFilter: 'value' },
			mockEmbeddings,
			0,
		);

		// Result should contain vector store and close function
		expect(result).toHaveProperty('response', mockVectorStore);
		expect(result).toHaveProperty('closeFunction');

		// Should wrap vector store with logWrapper
		expect(logWrapper).toHaveBeenCalledWith(mockVectorStore, mockContext);
	});

	it('should create a closeFunction that releases the vector store client', async () => {
		const result = await handleRetrieveOperation(mockContext, mockArgs, mockEmbeddings, 0);

		// Call the closeFunction
		await result.closeFunction!();

		// Should release the vector store client
		expect(mockArgs.releaseVectorStoreClient).toHaveBeenCalledWith(mockVectorStore);
	});

	it('should handle vector store client when no releaseVectorStoreClient is provided', async () => {
		// Remove releaseVectorStoreClient method
		mockArgs.releaseVectorStoreClient = undefined;

		const result = await handleRetrieveOperation(mockContext, mockArgs, mockEmbeddings, 0);

		// Call the closeFunction - should not throw error even with no release method
		await expect(result.closeFunction!()).resolves.not.toThrow();
	});

	it('should retrieve vector store without reranker when useReranker is false', async () => {
		mockContext.getNodeParameter.mockReturnValue(false);

		const result = await handleRetrieveOperation(mockContext, mockArgs, mockEmbeddings, 0);

		expect(mockContext.getNodeParameter).toHaveBeenCalledWith('useReranker', 0, false);

		expect(mockArgs.getVectorStoreClient).toHaveBeenCalledWith(
			mockContext,
			{ testFilter: 'value' },
			mockEmbeddings,
			0,
		);

		// Result should contain vector store and close function
		expect(result).toHaveProperty('response', mockVectorStore);
		expect(result).toHaveProperty('closeFunction');

		// Should not try to get reranker input connection
		expect(mockContext.getInputConnectionData).not.toHaveBeenCalled();
	});

	it('should retrieve vector store with reranker when useReranker is true', async () => {
		mockContext.getNodeParameter.mockReturnValue(true);
		mockContext.getInputConnectionData.mockResolvedValue(mockReranker);

		const result = await handleRetrieveOperation(mockContext, mockArgs, mockEmbeddings, 0);

		expect(mockContext.getNodeParameter).toHaveBeenCalledWith('useReranker', 0, false);

		expect(mockContext.getInputConnectionData).toHaveBeenCalledWith(
			NodeConnectionTypes.AiReranker,
			0,
		);

		expect(result.response).toEqual({
			reranker: mockReranker,
			vectorStore: mockVectorStore,
		});
		expect(result).toHaveProperty('closeFunction');
	});
});
