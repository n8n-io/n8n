/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/unbound-method */
import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { logAiEvent } from '@utils/helpers';

import type { VectorStoreNodeConstructorArgs } from '../../types';
import { handleLoadOperation } from '../loadOperation';

// Mock helper functions from external modules
jest.mock('@utils/helpers', () => ({
	getMetadataFiltersValues: jest.fn().mockReturnValue({ testFilter: 'value' }),
	logAiEvent: jest.fn(),
}));

describe('handleLoadOperation', () => {
	let mockContext: MockProxy<IExecuteFunctions>;
	let mockEmbeddings: MockProxy<Embeddings>;
	let mockVectorStore: MockProxy<VectorStore>;
	let mockArgs: VectorStoreNodeConstructorArgs<VectorStore>;
	let nodeParameters: Record<string, any>;

	beforeEach(() => {
		nodeParameters = {
			prompt: 'test search query',
			topK: 3,
			includeDocumentMetadata: true,
		};

		mockContext = mock<IExecuteFunctions>();
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
			[{ pageContent: 'test content 3', metadata: { test: 'metadata 3' } } as Document, 0.75],
		]);

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

	it('should retrieve documents from vector store with similarity search', async () => {
		const result = await handleLoadOperation(mockContext, mockArgs, mockEmbeddings, 0);

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
		expect(result).toHaveLength(3);
	});

	it('should include document metadata when includeDocumentMetadata is true', async () => {
		const result = await handleLoadOperation(mockContext, mockArgs, mockEmbeddings, 0);

		expect(result[0].json.document).toHaveProperty('metadata');
		expect((result[0].json?.document as IDataObject)?.metadata).toEqual({ test: 'metadata 1' });
		expect((result[0].json?.document as IDataObject)?.pageContent).toEqual('test content 1');
		expect(result[0].json?.score).toEqual(0.95);
	});

	it('should exclude document metadata when includeDocumentMetadata is false', async () => {
		nodeParameters.includeDocumentMetadata = false;

		const result = await handleLoadOperation(mockContext, mockArgs, mockEmbeddings, 0);

		expect(result[0].json?.document).not.toHaveProperty('metadata');
		expect((result[0].json?.document as IDataObject)?.pageContent).toEqual('test content 1');
		expect(result[0].json?.score).toEqual(0.95);
	});

	it('should use the topK parameter to limit results', async () => {
		nodeParameters.topK = 2;

		await handleLoadOperation(mockContext, mockArgs, mockEmbeddings, 0);

		expect(mockVectorStore.similaritySearchVectorWithScore).toHaveBeenCalledWith(
			expect.anything(),
			2,
			expect.anything(),
		);
	});

	it('should properly set pairedItem property in results', async () => {
		const result = await handleLoadOperation(mockContext, mockArgs, mockEmbeddings, 0);

		result.forEach((item) => {
			expect(item).toHaveProperty('pairedItem');
			expect(item.pairedItem).toEqual({ item: 0 });
		});
	});

	it('should log AI event with query after search is complete', async () => {
		await handleLoadOperation(mockContext, mockArgs, mockEmbeddings, 0);

		expect(logAiEvent).toHaveBeenCalledWith(mockContext, 'ai-vector-store-searched', {
			query: 'test search query',
		});
	});

	it('should release vector store client even if an error occurs', async () => {
		mockVectorStore.similaritySearchVectorWithScore.mockRejectedValue(new Error('Test error'));

		await expect(handleLoadOperation(mockContext, mockArgs, mockEmbeddings, 0)).rejects.toThrow(
			'Test error',
		);

		expect(mockArgs.releaseVectorStoreClient).toHaveBeenCalledWith(mockVectorStore);
	});
});
