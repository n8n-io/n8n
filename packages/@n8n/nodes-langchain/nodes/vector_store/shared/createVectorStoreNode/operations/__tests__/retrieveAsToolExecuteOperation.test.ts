/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/unbound-method */
import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { logAiEvent } from '@utils/helpers';

import type { VectorStoreNodeConstructorArgs } from '../../types';
import { handleRetrieveAsToolExecuteOperation } from '../retrieveAsToolExecuteOperation';

// Mock helper functions from external modules
jest.mock('@utils/helpers', () => ({
	getMetadataFiltersValues: jest.fn().mockReturnValue({ testFilter: 'value' }),
	logAiEvent: jest.fn(),
}));

describe('handleRetrieveAsToolExecuteOperation', () => {
	let mockContext: MockProxy<IExecuteFunctions>;
	let mockEmbeddings: MockProxy<Embeddings>;
	let mockVectorStore: MockProxy<VectorStore>;
	let mockReranker: MockProxy<BaseDocumentCompressor>;
	let mockArgs: VectorStoreNodeConstructorArgs<VectorStore>;
	let nodeParameters: Record<string, any>;
	let inputData: INodeExecutionData[];

	beforeEach(() => {
		nodeParameters = {
			topK: 3,
			includeDocumentMetadata: true,
			useReranker: false,
		};

		inputData = [
			{
				json: { input: 'test search query' },
				pairedItem: { item: 0 },
			},
		];

		mockContext = mock<IExecuteFunctions>();
		mockContext.getNodeParameter.mockImplementation((parameterName, _itemIndex, fallbackValue) => {
			if (typeof parameterName !== 'string') return fallbackValue;
			return nodeParameters[parameterName] ?? fallbackValue;
		});
		mockContext.getInputData.mockReturnValue(inputData);

		mockEmbeddings = mock<Embeddings>();
		mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);

		mockVectorStore = mock<VectorStore>();
		mockVectorStore.similaritySearchVectorWithScore.mockResolvedValue([
			[{ pageContent: 'test content 1', metadata: { test: 'metadata 1' } } as Document, 0.95],
			[{ pageContent: 'test content 2', metadata: { test: 'metadata 2' } } as Document, 0.85],
			[{ pageContent: 'test content 3', metadata: { test: 'metadata 3' } } as Document, 0.75],
		]);

		mockReranker = mock<BaseDocumentCompressor>();
		mockReranker.compressDocuments.mockResolvedValue([
			{
				pageContent: 'test content 2',
				metadata: { test: 'metadata 2', relevanceScore: 0.98 },
			} as Document,
			{
				pageContent: 'test content 1',
				metadata: { test: 'metadata 1', relevanceScore: 0.92 },
			} as Document,
			{
				pageContent: 'test content 3',
				metadata: { test: 'metadata 3', relevanceScore: 0.88 },
			} as Document,
		]);

		mockContext.getInputConnectionData.mockResolvedValue(mockReranker);

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

	it('should retrieve documents from vector store using query from input data', async () => {
		const result = await handleRetrieveAsToolExecuteOperation(
			mockContext,
			mockArgs,
			mockEmbeddings,
			0,
		);

		expect(mockArgs.getVectorStoreClient).toHaveBeenCalledWith(
			mockContext,
			undefined,
			mockEmbeddings,
			0,
		);

		expect(mockEmbeddings.embedQuery).toHaveBeenCalledWith('test search query');

		expect(mockVectorStore.similaritySearchVectorWithScore).toHaveBeenCalledWith(
			[0.1, 0.2, 0.3],
			3,
			{ testFilter: 'value' },
		);

		expect(result).toHaveLength(1);
		expect(result[0].json.response).toHaveLength(3);
		const response = result[0].json.response as Array<{ type: string; text: string }>;
		expect(response[0]).toEqual({
			type: 'text',
			text: JSON.stringify({
				pageContent: 'test content 1',
				metadata: { test: 'metadata 1' },
			}),
		});
		expect(result[0].pairedItem).toEqual({ item: 0 });

		expect(mockArgs.releaseVectorStoreClient).toHaveBeenCalledWith(mockVectorStore);
		expect(logAiEvent).toHaveBeenCalledWith(mockContext, 'ai-vector-store-searched', {
			input: 'test search query',
		});
	});

	it('should throw error when input data does not contain query', async () => {
		inputData[0].json = { notQuery: 'some value' };

		await expect(
			handleRetrieveAsToolExecuteOperation(mockContext, mockArgs, mockEmbeddings, 0),
		).rejects.toThrow('Input data must contain a "input" field with the search query');
	});

	it('should throw error when query is not a string', async () => {
		inputData[0].json = { input: 123 };

		await expect(
			handleRetrieveAsToolExecuteOperation(mockContext, mockArgs, mockEmbeddings, 0),
		).rejects.toThrow('Input data must contain a "input" field with the search query');
	});

	it('should throw error when query is empty string', async () => {
		inputData[0].json = { input: '' };

		await expect(
			handleRetrieveAsToolExecuteOperation(mockContext, mockArgs, mockEmbeddings, 0),
		).rejects.toThrow('Input data must contain a "input" field with the search query');
	});

	it('should include metadata when includeDocumentMetadata is true', async () => {
		const result = await handleRetrieveAsToolExecuteOperation(
			mockContext,
			mockArgs,
			mockEmbeddings,
			0,
		);

		expect(result).toHaveLength(1);
		expect(result[0].json.response).toHaveLength(3);
		const response = result[0].json.response as Array<{ type: string; text: string }>;
		const firstDoc = JSON.parse(response[0].text);
		expect(firstDoc).toHaveProperty('metadata');
		expect(firstDoc.metadata).toEqual({ test: 'metadata 1' });
	});

	it('should exclude metadata when includeDocumentMetadata is false', async () => {
		nodeParameters.includeDocumentMetadata = false;

		const result = await handleRetrieveAsToolExecuteOperation(
			mockContext,
			mockArgs,
			mockEmbeddings,
			0,
		);

		expect(result).toHaveLength(1);
		expect(result[0].json.response).toHaveLength(3);
		const response = result[0].json.response as Array<{ pageContent: string }>;
		const firstDoc = JSON.parse(response[0].pageContent);
		expect(firstDoc).not.toHaveProperty('metadata');
		expect(firstDoc).toEqual({
			pageContent: 'test content 1',
		});
	});

	it('should limit results based on topK parameter', async () => {
		nodeParameters.topK = 1;

		await handleRetrieveAsToolExecuteOperation(mockContext, mockArgs, mockEmbeddings, 0);

		expect(mockVectorStore.similaritySearchVectorWithScore).toHaveBeenCalledWith(
			expect.anything(),
			1,
			expect.anything(),
		);
	});

	it('should use topK default value when not provided', async () => {
		delete nodeParameters.topK;

		await handleRetrieveAsToolExecuteOperation(mockContext, mockArgs, mockEmbeddings, 0);

		expect(mockVectorStore.similaritySearchVectorWithScore).toHaveBeenCalledWith(
			expect.anything(),
			4, // default value
			expect.anything(),
		);
	});

	it('should release vector store client even if search fails', async () => {
		mockVectorStore.similaritySearchVectorWithScore.mockRejectedValueOnce(
			new Error('Search failed'),
		);

		await expect(
			handleRetrieveAsToolExecuteOperation(mockContext, mockArgs, mockEmbeddings, 0),
		).rejects.toThrow('Search failed');

		expect(mockArgs.releaseVectorStoreClient).toHaveBeenCalledWith(mockVectorStore);
	});

	describe('reranking functionality', () => {
		beforeEach(() => {
			nodeParameters.useReranker = true;
		});

		it('should use reranker when useReranker is true', async () => {
			await handleRetrieveAsToolExecuteOperation(mockContext, mockArgs, mockEmbeddings, 0);

			expect(mockContext.getInputConnectionData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiReranker,
				0,
			);
			expect(mockReranker.compressDocuments).toHaveBeenCalledWith(
				[
					{ pageContent: 'test content 1', metadata: { test: 'metadata 1' } },
					{ pageContent: 'test content 2', metadata: { test: 'metadata 2' } },
					{ pageContent: 'test content 3', metadata: { test: 'metadata 3' } },
				],
				'test search query',
			);
		});

		it('should return reranked documents in the correct order', async () => {
			const result = await handleRetrieveAsToolExecuteOperation(
				mockContext,
				mockArgs,
				mockEmbeddings,
				0,
			);

			expect(result).toHaveLength(1);
			expect(result[0].json.response).toHaveLength(3);
			const response = result[0].json.response as Array<{ type: string; text: string }>;

			// First result should be the reranked first document (was second in original order)
			const doc0 = JSON.parse(response[0].text);
			expect(doc0.pageContent).toEqual('test content 2');
			expect(doc0.metadata).toEqual({ test: 'metadata 2' });

			// Second result should be the reranked second document (was first in original order)
			const doc1 = JSON.parse(response[1].text);
			expect(doc1.pageContent).toEqual('test content 1');
			expect(doc1.metadata).toEqual({ test: 'metadata 1' });

			// Third result should be the reranked third document
			const doc2 = JSON.parse(response[2].text);
			expect(doc2.pageContent).toEqual('test content 3');
			expect(doc2.metadata).toEqual({ test: 'metadata 3' });
		});

		it('should handle reranking with includeDocumentMetadata false', async () => {
			nodeParameters.includeDocumentMetadata = false;

			const result = await handleRetrieveAsToolExecuteOperation(
				mockContext,
				mockArgs,
				mockEmbeddings,
				0,
			);

			expect(result).toHaveLength(1);
			expect(result[0].json.response).toHaveLength(3);
			const response = result[0].json.response as Array<{ pageContent: string }>;

			// Should maintain reranked order but exclude metadata
			const doc0 = JSON.parse(response[0].pageContent);
			expect(doc0).toEqual({ pageContent: 'test content 2' });
			const doc1 = JSON.parse(response[1].pageContent);
			expect(doc1).toEqual({ pageContent: 'test content 1' });
			const doc2 = JSON.parse(response[2].pageContent);
			expect(doc2).toEqual({ pageContent: 'test content 3' });
		});

		it('should not call reranker when useReranker is false', async () => {
			nodeParameters.useReranker = false;

			await handleRetrieveAsToolExecuteOperation(mockContext, mockArgs, mockEmbeddings, 0);

			expect(mockContext.getInputConnectionData).not.toHaveBeenCalled();
			expect(mockReranker.compressDocuments).not.toHaveBeenCalled();
		});

		it('should release vector store client even if reranking fails', async () => {
			mockReranker.compressDocuments.mockRejectedValueOnce(new Error('Reranking failed'));

			await expect(
				handleRetrieveAsToolExecuteOperation(mockContext, mockArgs, mockEmbeddings, 0),
			).rejects.toThrow('Reranking failed');

			expect(mockArgs.releaseVectorStoreClient).toHaveBeenCalledWith(mockVectorStore);
		});

		it('should properly handle relevanceScore from reranker metadata', async () => {
			// Mock reranker to return documents with relevanceScore in different metadata structure
			mockReranker.compressDocuments.mockResolvedValueOnce([
				{
					pageContent: 'test content 2',
					metadata: { test: 'metadata 2', relevanceScore: 0.98, otherField: 'value' },
				} as Document,
				{
					pageContent: 'test content 1',
					metadata: { test: 'metadata 1', relevanceScore: 0.92 },
				} as Document,
			]);

			const result = await handleRetrieveAsToolExecuteOperation(
				mockContext,
				mockArgs,
				mockEmbeddings,
				0,
			);

			expect(result).toHaveLength(1);
			expect(result[0].json.response).toHaveLength(2);
			const response = result[0].json.response as Array<{ type: string; text: string }>;

			// Check that relevanceScore is used but metadata is preserved without relevanceScore
			const doc0 = JSON.parse(response[0].text);
			expect(doc0.metadata).toEqual({ test: 'metadata 2', otherField: 'value' });
			expect(doc0.metadata).not.toHaveProperty('relevanceScore');

			const doc1 = JSON.parse(response[1].text);
			expect(doc1.metadata).toEqual({ test: 'metadata 1' });
			expect(doc1.metadata).not.toHaveProperty('relevanceScore');
		});

		it('should not use reranker when no documents are found', async () => {
			mockVectorStore.similaritySearchVectorWithScore.mockResolvedValueOnce([]);

			const result = await handleRetrieveAsToolExecuteOperation(
				mockContext,
				mockArgs,
				mockEmbeddings,
				0,
			);

			expect(mockContext.getInputConnectionData).not.toHaveBeenCalled();
			expect(mockReranker.compressDocuments).not.toHaveBeenCalled();
			expect(result).toHaveLength(1);
			expect(result[0].json.response).toHaveLength(0);
		});
	});

	describe('empty result handling', () => {
		it('should return empty array when vector store returns no documents', async () => {
			mockVectorStore.similaritySearchVectorWithScore.mockResolvedValueOnce([]);

			const result = await handleRetrieveAsToolExecuteOperation(
				mockContext,
				mockArgs,
				mockEmbeddings,
				0,
			);

			expect(result).toHaveLength(1);
			expect(result[0].json.response).toHaveLength(0);
			expect(logAiEvent).toHaveBeenCalledWith(mockContext, 'ai-vector-store-searched', {
				input: 'test search query',
			});
		});
	});

	describe('error handling', () => {
		it('should release client resources when embedQuery fails', async () => {
			mockEmbeddings.embedQuery.mockRejectedValueOnce(new Error('Embedding failed'));

			await expect(
				handleRetrieveAsToolExecuteOperation(mockContext, mockArgs, mockEmbeddings, 0),
			).rejects.toThrow('Embedding failed');

			expect(mockArgs.releaseVectorStoreClient).toHaveBeenCalledWith(mockVectorStore);
		});

		it('should handle missing releaseVectorStoreClient function gracefully', async () => {
			delete mockArgs.releaseVectorStoreClient;

			const result = await handleRetrieveAsToolExecuteOperation(
				mockContext,
				mockArgs,
				mockEmbeddings,
				0,
			);

			expect(result).toHaveLength(1);
			expect(result[0].json.response).toHaveLength(3);
			// Should not throw error when releaseVectorStoreClient is undefined
		});
	});
});
