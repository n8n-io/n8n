/* eslint-disable @typescript-eslint/unbound-method */
import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { logAiEvent } from '@utils/helpers';

import type { VectorStoreNodeConstructorArgs } from '../../types';
import { isUpdateSupported } from '../../utils';
import { handleUpdateOperation } from '../updateOperation';

// Mock dependencies
jest.mock('../../utils', () => ({
	isUpdateSupported: jest.fn(),
}));

jest.mock('@utils/helpers', () => ({
	logAiEvent: jest.fn(),
}));

jest.mock('../../../processDocuments', () => ({
	processDocument: jest.fn().mockImplementation((_documentInput, _itemData, itemIndex) => {
		const mockProcessed = [
			{
				pageContent: `updated content ${itemIndex}`,
				metadata: { source: 'test-update' },
			} as Document,
		];

		const mockSerialized = [
			{
				json: {
					pageContent: `updated content ${itemIndex}`,
					metadata: { source: 'test-update' },
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

describe('handleUpdateOperation', () => {
	let mockContext: MockProxy<IExecuteFunctions>;
	let mockEmbeddings: MockProxy<Embeddings>;
	let mockVectorStore: MockProxy<VectorStore>;
	let mockArgs: VectorStoreNodeConstructorArgs<VectorStore>;
	let mockInputItems: INodeExecutionData[];

	beforeEach(() => {
		// Mock isUpdateSupported to return true by default
		(isUpdateSupported as jest.Mock).mockReturnValue(true);

		// Mock input items
		mockInputItems = [{ json: { text: 'test document 1' } }, { json: { text: 'test document 2' } }];

		// Setup context mock
		mockContext = mock<IExecuteFunctions>();
		mockContext.getInputData.mockReturnValue(mockInputItems);
		mockContext.getNodeParameter.mockImplementation((paramName, itemIndex) => {
			if (paramName === 'id') {
				return `doc-id-${itemIndex}`;
			}
			return undefined;
		});

		// Setup embeddings mock
		mockEmbeddings = mock<Embeddings>();

		// Setup vector store mock
		mockVectorStore = mock<VectorStore>();
		mockVectorStore.addDocuments.mockResolvedValue(undefined);

		// Setup args mock
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

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should throw error if update is not supported', async () => {
		// Mock isUpdateSupported to return false
		(isUpdateSupported as jest.Mock).mockReturnValue(false);

		await expect(handleUpdateOperation(mockContext, mockArgs, mockEmbeddings)).rejects.toThrow(
			NodeOperationError,
		);

		expect(mockArgs.getVectorStoreClient).not.toHaveBeenCalled();
	});

	it('should update documents with their IDs', async () => {
		const result = await handleUpdateOperation(mockContext, mockArgs, mockEmbeddings);

		// Should process all items
		expect(result).toHaveLength(2);

		// Should get vector store client for each item
		expect(mockArgs.getVectorStoreClient).toHaveBeenCalledTimes(2);

		// Should call addDocuments with documents and IDs
		expect(mockVectorStore.addDocuments).toHaveBeenCalledTimes(2);

		// First call should use doc-id-0
		expect(mockVectorStore.addDocuments).toHaveBeenNthCalledWith(
			1,
			[expect.objectContaining({ pageContent: 'updated content 0' })],
			{ ids: ['doc-id-0'] },
		);

		// Second call should use doc-id-1
		expect(mockVectorStore.addDocuments).toHaveBeenNthCalledWith(
			2,
			[expect.objectContaining({ pageContent: 'updated content 1' })],
			{ ids: ['doc-id-1'] },
		);

		// Should log AI event for each update
		expect(logAiEvent).toHaveBeenCalledTimes(2);
		expect(logAiEvent).toHaveBeenCalledWith(mockContext, 'ai-vector-store-updated');
	});

	it('should release vector store client even if update fails', async () => {
		// Mock addDocuments to fail
		mockVectorStore.addDocuments.mockRejectedValue(new Error('Update failed'));

		await expect(handleUpdateOperation(mockContext, mockArgs, mockEmbeddings)).rejects.toThrow(
			'Update failed',
		);

		// Should still release the client
		expect(mockArgs.releaseVectorStoreClient).toHaveBeenCalledWith(mockVectorStore);
	});

	it('should use proper document ID from node parameters', async () => {
		// Setup custom document IDs
		mockContext.getNodeParameter
			.mockReturnValueOnce('custom-id-123')
			.mockReturnValueOnce('custom-id-456');

		await handleUpdateOperation(mockContext, mockArgs, mockEmbeddings);

		// First call should use custom-id-123
		expect(mockVectorStore.addDocuments).toHaveBeenNthCalledWith(1, expect.anything(), {
			ids: ['custom-id-123'],
		});

		// Second call should use custom-id-456
		expect(mockVectorStore.addDocuments).toHaveBeenNthCalledWith(2, expect.anything(), {
			ids: ['custom-id-456'],
		});
	});
});
