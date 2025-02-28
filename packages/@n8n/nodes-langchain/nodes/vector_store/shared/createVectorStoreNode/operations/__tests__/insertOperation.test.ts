import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { logAiEvent } from '@utils/helpers';
import type { N8nBinaryLoader } from '@utils/N8nBinaryLoader';
import type { N8nJsonLoader } from '@utils/N8nJsonLoader';

import type { VectorStoreNodeConstructorArgs } from '../../types';
import { handleInsertOperation } from '../insertOperation';

// Mock processDocument function
jest.mock('../../../processDocuments', () => ({
	processDocument: jest.fn().mockImplementation((documentInput, itemData, itemIndex) => {
		const mockProcessed = [
			{
				pageContent: `processed content ${itemIndex}`,
				metadata: { source: 'test' },
			} as Document,
		];

		const mockSerialized = [
			{
				json: {
					pageContent: `processed content ${itemIndex}`,
					metadata: { source: 'test' },
				},
				pairedItem: { item: itemIndex },
			},
		];

		return {
			processedDocuments: mockProcessed,
			serializedDocuments: mockSerialized,
		};
	}),
}));

// Mock helper functions
jest.mock('@utils/helpers', () => ({
	logAiEvent: jest.fn(),
}));

describe('handleInsertOperation', () => {
	let mockContext: MockProxy<IExecuteFunctions>;
	let mockEmbeddings: MockProxy<Embeddings>;
	let mockVectorStore: MockProxy<VectorStore>;
	let mockArgs: VectorStoreNodeConstructorArgs<VectorStore>;
	let mockInputItems: INodeExecutionData[];
	let mockJsonLoader: MockProxy<N8nJsonLoader>;

	beforeEach(() => {
		// Mock input items
		mockInputItems = [
			{ json: { text: 'test document 1' } },
			{ json: { text: 'test document 2' } },
			{ json: { text: 'test document 3' } },
		];

		// Setup context mock
		mockContext = mock<IExecuteFunctions>();
		mockContext.getInputData.mockReturnValue(mockInputItems);
		mockContext.getExecutionCancelSignal = jest.fn().mockReturnValue({ aborted: false });
		mockContext.getInputConnectionData.mockResolvedValue(mockJsonLoader);

		// Setup embeddings mock
		mockEmbeddings = mock<Embeddings>();

		// Setup JSON loader mock
		mockJsonLoader = mock<N8nJsonLoader>();

		// Setup vector store mock
		mockVectorStore = mock<VectorStore>();

		// Setup args mock
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

	it('should process all input items and populate vector store', async () => {
		const result = await handleInsertOperation(mockContext, mockArgs, mockEmbeddings);

		// Should get document input from connection
		expect(mockContext.getInputConnectionData).toHaveBeenCalledWith(
			NodeConnectionType.AiDocument,
			0,
		);

		// Should process each item
		expect(result).toHaveLength(3);

		// Should call populateVectorStore for each item
		expect(mockArgs.populateVectorStore).toHaveBeenCalledTimes(1);

		// Should log AI event for each item
		expect(logAiEvent).toHaveBeenCalledTimes(3);
		expect(logAiEvent).toHaveBeenCalledWith(mockContext, 'ai-vector-store-populated');
	});

	it('should stop processing if execution is cancelled', async () => {
		// Mock execution being cancelled after first item
		mockContext.getExecutionCancelSignal
			.mockReturnValueOnce({ aborted: false })
			.mockReturnValueOnce({ aborted: true });

		const result = await handleInsertOperation(mockContext, mockArgs, mockEmbeddings);

		// Should only process the first item
		expect(mockArgs.populateVectorStore).toHaveBeenCalledTimes(1);
		expect(logAiEvent).toHaveBeenCalledTimes(1);
	});

	it('should handle different document input types', async () => {
		// Test with Binary Loader
		const mockBinaryLoader = mock<N8nBinaryLoader>();
		mockContext.getInputConnectionData.mockResolvedValueOnce(mockBinaryLoader);

		await handleInsertOperation(mockContext, mockArgs, mockEmbeddings);

		// Test with Document Array
		const mockDocuments = [{ pageContent: 'test content', metadata: {} } as Document];
		mockContext.getInputConnectionData.mockResolvedValueOnce(mockDocuments);

		await handleInsertOperation(mockContext, mockArgs, mockEmbeddings);

		// Both calls should process all items
		expect(mockArgs.populateVectorStore).toHaveBeenCalledTimes(2);
	});

	it('should pass the correct documents to populateVectorStore', async () => {
		await handleInsertOperation(mockContext, mockArgs, mockEmbeddings);

		// Check that populateVectorStore is called once with all documents
		expect(mockArgs.populateVectorStore).toHaveBeenCalledTimes(1);
		expect(mockArgs.populateVectorStore).toHaveBeenCalledWith(
			mockContext,
			mockEmbeddings,
			expect.arrayContaining([
				expect.objectContaining({
					pageContent: 'processed content 0',
					metadata: { source: 'test' },
				}),
				expect.objectContaining({
					pageContent: 'processed content 1',
					metadata: { source: 'test' },
				}),
				expect.objectContaining({
					pageContent: 'processed content 2',
					metadata: { source: 'test' },
				}),
			]),
			0,
		);
	});
});
