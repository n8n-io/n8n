/* eslint-disable @typescript-eslint/unbound-method */
import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { DynamicTool } from 'langchain/tools';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';

import type { VectorStoreNodeConstructorArgs } from '../../types';
import { handleRetrieveAsToolOperation } from '../retrieveAsToolOperation';

// Mock the helper functions
jest.mock('@utils/helpers', () => ({
	...jest.requireActual('@utils/helpers'),
	getMetadataFiltersValues: jest.fn().mockReturnValue({ testFilter: 'value' }),
}));

jest.mock('@utils/logWrapper', () => ({
	logWrapper: jest.fn().mockImplementation((obj) => obj),
}));

describe('handleRetrieveAsToolOperation', () => {
	let mockContext: MockProxy<ISupplyDataFunctions>;
	let mockEmbeddings: MockProxy<Embeddings>;
	let mockVectorStore: MockProxy<VectorStore>;
	let mockReranker: MockProxy<BaseDocumentCompressor>;
	let mockArgs: VectorStoreNodeConstructorArgs<VectorStore>;
	let nodeParameters: Record<string, any>;

	beforeEach(() => {
		nodeParameters = {
			toolName: 'test_knowledge_base',
			toolDescription: 'Search the test knowledge base',
			topK: 3,
			includeDocumentMetadata: true,
			useReranker: false,
		};

		mockContext = mock<ISupplyDataFunctions>();
		mockContext.getNode.mockReturnValue({
			id: 'testNode',
			typeVersion: 1.3,
			name: 'Test Knowledge Base',
			type: 'testVectorStore',
			parameters: nodeParameters,
			position: [0, 0],
		});
		mockContext.getNodeParameter.mockImplementation((parameterName, _itemIndex, fallbackValue) => {
			if (typeof parameterName !== 'string') return fallbackValue;
			return nodeParameters[parameterName] ?? fallbackValue;
		});

		mockEmbeddings = mock<Embeddings>();
		mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);

		mockVectorStore = mock<VectorStore>();
		mockVectorStore.similaritySearchVectorWithScore.mockResolvedValue([
			[{ pageContent: 'test content 1', metadata: { test: 'metadata 1' } } as Document, 0.95],
			[{ pageContent: 'test content 2', metadata: { test: 'metadata 2' } } as Document, 0.85],
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

	it('should create a dynamic tool with the correct name and description on version <= 1.2', async () => {
		mockContext.getNode.mockReturnValueOnce({
			id: 'testNode',
			typeVersion: 1.2,
			name: 'Test Knowledge Base',
			type: 'testVectorStore',
			parameters: nodeParameters,
			position: [0, 0],
		});

		const result = (await handleRetrieveAsToolOperation(
			mockContext,
			mockArgs,
			mockEmbeddings,
			0,
		)) as {
			response: DynamicTool;
		};

		expect(result).toHaveProperty('response');
		expect(result.response).toBeInstanceOf(DynamicTool);
		expect(result.response.name).toBe('test_knowledge_base');
		expect(result.response.description).toBe('Search the test knowledge base');

		// Check logWrapper was called
		expect(logWrapper).toHaveBeenCalledWith(expect.any(DynamicTool), mockContext);
	});

	it('should create a dynamic tool with the correct name and description on version > 1.2', async () => {
		const result = (await handleRetrieveAsToolOperation(
			mockContext,
			mockArgs,
			mockEmbeddings,
			0,
		)) as {
			response: DynamicTool;
		};

		expect(result).toHaveProperty('response');
		expect(result.response).toBeInstanceOf(DynamicTool);
		expect(result.response.name).toBe('Test_Knowledge_Base');
		expect(result.response.description).toBe('Search the test knowledge base');

		// Check logWrapper was called
		expect(logWrapper).toHaveBeenCalledWith(expect.any(DynamicTool), mockContext);
	});

	it('should create a tool that can search the vector store', async () => {
		const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);
		const tool = result.response as DynamicTool;

		// Invoke the tool's function
		const toolResult = await tool.func('test query');

		// Check vector store client was initialized
		expect(mockArgs.getVectorStoreClient).toHaveBeenCalledWith(
			mockContext,
			undefined,
			mockEmbeddings,
			0,
		);

		// Check query was embedded
		expect(mockEmbeddings.embedQuery).toHaveBeenCalledWith('test query');

		// Check vector store was searched
		expect(mockVectorStore.similaritySearchVectorWithScore).toHaveBeenCalledWith(
			[0.1, 0.2, 0.3],
			3,
			{ testFilter: 'value' },
		);

		// Check tool returns formatted results
		expect(toolResult).toHaveLength(2);
		expect(toolResult[0]).toHaveProperty('type', 'text');
		expect(toolResult[0]).toHaveProperty('text');

		// Check vector store client was released
		expect(mockArgs.releaseVectorStoreClient).toHaveBeenCalledWith(mockVectorStore);
	});

	it('should include metadata in results when includeDocumentMetadata is true', async () => {
		const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);
		const tool = result.response as DynamicTool;

		const toolResult = await tool.func('test query');

		// Parse the JSON text to verify it includes metadata
		const parsedFirst = JSON.parse(toolResult[0].text);
		expect(parsedFirst).toHaveProperty('pageContent', 'test content 1');
		expect(parsedFirst).toHaveProperty('metadata', { test: 'metadata 1' });
	});

	it('should exclude metadata in results when includeDocumentMetadata is false', async () => {
		nodeParameters.includeDocumentMetadata = false;

		const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);
		const tool = result.response as DynamicTool;

		const toolResult = await tool.func('test query');

		// Parse the JSON text to verify it excludes metadata
		const parsedFirst = JSON.parse(toolResult[0].text);
		expect(parsedFirst).toHaveProperty('pageContent', 'test content 1');
		expect(parsedFirst).not.toHaveProperty('metadata');
	});

	it('should limit results based on topK parameter', async () => {
		nodeParameters.topK = 1;

		const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);
		const tool = result.response as DynamicTool;

		await tool.func('test query');

		expect(mockVectorStore.similaritySearchVectorWithScore).toHaveBeenCalledWith(
			expect.anything(),
			1,
			expect.anything(),
		);
	});

	it('should release vector store client even if search fails', async () => {
		const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);
		const tool = result.response as DynamicTool;

		// Make the search fail
		mockVectorStore.similaritySearchVectorWithScore.mockRejectedValueOnce(
			new Error('Search failed'),
		);

		await expect(tool.func('test query')).rejects.toThrow('Search failed');

		// Should still release the client
		expect(mockArgs.releaseVectorStoreClient).toHaveBeenCalledWith(mockVectorStore);
	});

	describe('reranking functionality', () => {
		beforeEach(() => {
			nodeParameters.useReranker = true;
		});

		it('should use reranker when useReranker is true', async () => {
			const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);
			const tool = result.response as DynamicTool;

			await tool.func('test query');

			expect(mockContext.getInputConnectionData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiReranker,
				0,
			);
			expect(mockReranker.compressDocuments).toHaveBeenCalledWith(
				[
					{ pageContent: 'test content 1', metadata: { test: 'metadata 1' } },
					{ pageContent: 'test content 2', metadata: { test: 'metadata 2' } },
				],
				'test query',
			);
		});

		it('should return reranked documents in the correct order', async () => {
			const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);
			const tool = result.response as DynamicTool;

			const toolResult = await tool.func('test query');

			expect(toolResult).toHaveLength(2);

			// First result should be the reranked first document (was second in original order)
			const parsedFirst = JSON.parse(toolResult[0].text);
			expect(parsedFirst.pageContent).toEqual('test content 2');
			expect(parsedFirst.metadata).toEqual({ test: 'metadata 2' });

			// Second result should be the reranked second document (was first in original order)
			const parsedSecond = JSON.parse(toolResult[1].text);
			expect(parsedSecond.pageContent).toEqual('test content 1');
			expect(parsedSecond.metadata).toEqual({ test: 'metadata 1' });
		});

		it('should handle reranking with includeDocumentMetadata false', async () => {
			nodeParameters.includeDocumentMetadata = false;

			const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);
			const tool = result.response as DynamicTool;

			const toolResult = await tool.func('test query');

			// Parse the JSON text to verify it excludes metadata but maintains reranked order
			const parsedFirst = JSON.parse(toolResult[0].text);
			expect(parsedFirst).toHaveProperty('pageContent', 'test content 2');
			expect(parsedFirst).not.toHaveProperty('metadata');

			const parsedSecond = JSON.parse(toolResult[1].text);
			expect(parsedSecond).toHaveProperty('pageContent', 'test content 1');
			expect(parsedSecond).not.toHaveProperty('metadata');
		});

		it('should not call reranker when useReranker is false', async () => {
			nodeParameters.useReranker = false;

			const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);
			const tool = result.response as DynamicTool;

			await tool.func('test query');

			expect(mockContext.getInputConnectionData).not.toHaveBeenCalled();
			expect(mockReranker.compressDocuments).not.toHaveBeenCalled();
		});

		it('should release vector store client even if reranking fails', async () => {
			mockReranker.compressDocuments.mockRejectedValueOnce(new Error('Reranking failed'));

			const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);
			const tool = result.response as DynamicTool;

			await expect(tool.func('test query')).rejects.toThrow('Reranking failed');

			// Should still release the client
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

			const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);
			const tool = result.response as DynamicTool;

			const toolResult = await tool.invoke('test query');

			// Check that relevanceScore is used but not included in the final metadata
			const parsedFirst = JSON.parse(toolResult[0].text);
			expect(parsedFirst.pageContent).toEqual('test content 2');
			expect(parsedFirst.metadata).toEqual({ test: 'metadata 2', otherField: 'value' });
			expect(parsedFirst.metadata).not.toHaveProperty('relevanceScore');
		});
	});
});
