import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { VectorStoreNodeConstructorArgs } from '../../types';
import { handleLoadOperation } from '../loadOperation';
import { handleRetrieveAsToolOperation } from '../retrieveAsToolOperation';
import { handleRetrieveOperation } from '../retrieveOperation';
import { handleUpdateOperation } from '../updateOperation';

describe('Vector Store Operation Handlers', () => {
	let mockContext: MockProxy<IExecuteFunctions & ISupplyDataFunctions>;
	let mockEmbeddings: MockProxy<Embeddings>;
	let mockVectorStore: MockProxy<VectorStore>;
	let mockArgs: VectorStoreNodeConstructorArgs<VectorStore>;
	let nodeParameters: Record<string, any>;

	beforeEach(() => {
		nodeParameters = {
			mode: 'load',
			prompt: 'test query',
			topK: 3,
			includeDocumentMetadata: true,
			toolName: 'test_tool',
			toolDescription: 'Test tool description',
		};

		mockContext = mock<IExecuteFunctions & ISupplyDataFunctions>();
		mockContext.getNode.mockReturnValue({
			id: 'testNode',
			typeVersion: 1.3,
			name: 'Test Tool',
			type: 'testVectorStore',
			parameters: nodeParameters,
			position: [0, 0],
		});
		mockContext.getNodeParameter.mockImplementation((parameterName, _itemIndex, fallbackValue) => {
			if (typeof parameterName !== 'string') return fallbackValue;
			return nodeParameters[parameterName] ?? fallbackValue;
		});
		mockContext.getInputData.mockReturnValue([{ json: { test: 'data' } }]);

		mockEmbeddings = mock<Embeddings>();
		mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);

		mockVectorStore = mock<VectorStore>();
		mockVectorStore.similaritySearchVectorWithScore.mockResolvedValue([
			[{ pageContent: 'test content', metadata: { test: 'metadata' } } as Document, 0.95],
			[{ pageContent: 'test content 2', metadata: { test: 'metadata 2' } } as Document, 0.85],
		]);

		mockArgs = {
			meta: {
				displayName: 'Test Vector Store',
				name: 'testVectorStore',
				description: 'Vector store for testing',
				docsUrl: 'https://example.com',
				icon: 'file:testIcon.svg',
				operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool', 'update'],
			},
			sharedFields: [],
			getVectorStoreClient: jest.fn().mockResolvedValue(mockVectorStore),
			populateVectorStore: jest.fn().mockResolvedValue(undefined),
			releaseVectorStoreClient: jest.fn(),
		};
	});

	describe('handleLoadOperation', () => {
		it('should properly process load operation', async () => {
			const result = await handleLoadOperation(mockContext, mockArgs, mockEmbeddings, 0);

			expect(mockArgs.getVectorStoreClient).toHaveBeenCalledTimes(1);
			expect(mockEmbeddings.embedQuery).toHaveBeenCalledWith('test query');
			expect(mockVectorStore.similaritySearchVectorWithScore).toHaveBeenCalled();
			expect(result).toHaveLength(2);
			expect(result[0].json).toHaveProperty('document');
			expect(result[0].json).toHaveProperty('score');
			expect(mockArgs.releaseVectorStoreClient).toHaveBeenCalledWith(mockVectorStore);
		});

		it('should exclude metadata when includeDocumentMetadata is false', async () => {
			nodeParameters.includeDocumentMetadata = false;

			const result = await handleLoadOperation(mockContext, mockArgs, mockEmbeddings, 0);

			expect(result[0].json.document).not.toHaveProperty('metadata');
		});
	});

	describe('handleUpdateOperation', () => {
		it('should throw error when update is not supported', async () => {
			mockArgs.meta.operationModes = ['load', 'insert'];

			await expect(handleUpdateOperation(mockContext, mockArgs, mockEmbeddings)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('handleRetrieveOperation', () => {
		it('should return vector store with log wrapper and close function', async () => {
			const result = await handleRetrieveOperation(mockContext, mockArgs, mockEmbeddings, 0);

			expect(result).toHaveProperty('response');
			expect(result).toHaveProperty('closeFunction');
		});
	});

	describe('handleRetrieveAsToolOperation', () => {
		it('should return a tool with the correct name and description on version <= 1.2', async () => {
			mockContext.getNode.mockReturnValueOnce({
				id: 'testNode',
				typeVersion: 1.2,
				name: 'Test Tool',
				type: 'testVectorStore',
				parameters: nodeParameters,
				position: [0, 0],
			});

			const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);

			expect(result).toHaveProperty('response');
			expect(result.response).toHaveProperty('name', 'test_tool');
			expect(result.response).toHaveProperty('description', 'Test tool description');
		});

		it('should return a tool with the correct name and description on version > 1.2', async () => {
			const result = await handleRetrieveAsToolOperation(mockContext, mockArgs, mockEmbeddings, 0);

			expect(result).toHaveProperty('response');
			expect(result.response).toHaveProperty('name', 'Test_Tool');
			expect(result.response).toHaveProperty('description', 'Test tool description');
		});
	});
});
