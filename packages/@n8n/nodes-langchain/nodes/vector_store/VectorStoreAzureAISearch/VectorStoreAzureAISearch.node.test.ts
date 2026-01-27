import { AzureKeyCredential, SearchIndexClient } from '@azure/search-documents';
import { AzureAISearchVectorStore } from '@langchain/community/vectorstores/azure_aisearch';
import { mock } from 'jest-mock-extended';
import type {
	ISupplyDataFunctions,
	ILoadOptionsFunctions,
	INode,
	IExecuteFunctions,
} from 'n8n-workflow';

import {
	VectorStoreAzureAISearch,
	getIndexName,
	clearAzureSearchIndex,
	transformDocumentsForAzure,
} from './VectorStoreAzureAISearch.node';

jest.mock('@langchain/community/vectorstores/azure_aisearch');
jest.mock('@azure/identity');
jest.mock('@azure/search-documents');

const MockedSearchIndexClient = SearchIndexClient as jest.MockedClass<typeof SearchIndexClient>;

describe('VectorStoreAzureAISearch', () => {
	const vectorStore = new VectorStoreAzureAISearch();
	const helpers = mock<ISupplyDataFunctions['helpers']>();
	const executeFunctions = mock<ISupplyDataFunctions>({ helpers });

	beforeEach(() => {
		jest.resetAllMocks();
		executeFunctions.addInputData.mockReturnValue({ index: 0 });
	});

	it('should get vector store client with API key authentication', async () => {
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'mode':
					return 'retrieve';
				case 'indexName':
					return 'test-index';
				case 'options':
					return {};
				default:
					return undefined;
			}
		});

		executeFunctions.getCredentials.mockResolvedValue({
			authType: 'apiKey',
			endpoint: 'https://test-search.search.windows.net',
			apiKey: 'test-api-key',
		});

		const mockEmbeddings = {};
		executeFunctions.getInputConnectionData.mockResolvedValue(mockEmbeddings);

		const { response } = await vectorStore.supplyData.call(executeFunctions, 0);

		expect(response).toBeDefined();
		expect(AzureAISearchVectorStore).toHaveBeenCalledWith(mockEmbeddings, {
			endpoint: 'https://test-search.search.windows.net',
			indexName: 'test-index',
			credentials: expect.any(AzureKeyCredential),
			search: {
				type: expect.any(String),
			},
			clientOptions: {
				userAgentOptions: { userAgentPrefix: 'n8n-azure-ai-search' },
			},
		});
	});

	it('should configure search options with filter and semantic configuration', async () => {
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'mode':
					return 'retrieve';
				case 'indexName':
					return 'test-index';
				case 'options':
					return {
						queryType: 'semanticHybrid',
						filter: "category eq 'tech'",
						semanticConfiguration: 'test-semantic-config',
					};
				default:
					return undefined;
			}
		});

		executeFunctions.getCredentials.mockResolvedValue({
			authType: 'apiKey',
			endpoint: 'https://test-search.search.windows.net',
			apiKey: 'test-api-key',
		});

		const mockEmbeddings = {};
		executeFunctions.getInputConnectionData.mockResolvedValue(mockEmbeddings);

		const { response } = await vectorStore.supplyData.call(executeFunctions, 0);

		expect(response).toBeDefined();
		expect(AzureAISearchVectorStore).toHaveBeenCalledWith(mockEmbeddings, {
			endpoint: 'https://test-search.search.windows.net',
			indexName: 'test-index',
			credentials: expect.any(AzureKeyCredential),
			search: {
				type: expect.any(String),
				filter: "category eq 'tech'",
				semanticConfigurationName: 'test-semantic-config',
			},
			clientOptions: {
				userAgentOptions: { userAgentPrefix: 'n8n-azure-ai-search' },
			},
		});
	});

	it('should handle ILoadOptionsFunctions context correctly', () => {
		const loadOptionsFunctions = mock<ILoadOptionsFunctions>();
		const mockNode = mock<INode>();

		loadOptionsFunctions.getNode.mockReturnValue(mockNode);
		loadOptionsFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'indexName') {
				return 'test-load-options-index';
			}
			return undefined;
		});

		const indexName = getIndexName(loadOptionsFunctions, 0);

		expect(indexName).toBe('test-load-options-index');
		// Verify getNodeParameter was called with correct signature (no itemIndex)
		expect(loadOptionsFunctions.getNodeParameter).toHaveBeenCalledWith('indexName', '', {
			extractValue: true,
		});
	});

	describe('clearIndex functionality', () => {
		const mockDeleteIndex = jest.fn().mockResolvedValue(undefined);
		const mockContext = mock<IExecuteFunctions>();
		const mockLogger = { debug: jest.fn() };

		beforeEach(() => {
			jest.clearAllMocks();

			// Setup mock for SearchIndexClient
			MockedSearchIndexClient.mockImplementation(
				() =>
					({
						deleteIndex: mockDeleteIndex,
					}) as unknown as SearchIndexClient,
			);

			// Setup common mocks for context
			mockContext.getCredentials.mockResolvedValue({
				endpoint: 'https://test-search.search.windows.net',
				apiKey: 'test-api-key',
			});

			mockContext.getNode.mockReturnValue({
				id: 'test-node-id',
				name: 'Azure AI Search',
				type: 'vectorStoreAzureAISearch',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});

			mockContext.logger = mockLogger as unknown as IExecuteFunctions['logger'];
		});

		it('should delete index when clearIndex is true', async () => {
			mockContext.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'indexName':
						return 'test-index';
					case 'options':
						return { clearIndex: true };
					default:
						return undefined;
				}
			});

			const result = await clearAzureSearchIndex(mockContext, 0);

			// Verify the function returned true (index was deleted)
			expect(result).toBe(true);

			// Verify SearchIndexClient was instantiated with correct credentials
			expect(MockedSearchIndexClient).toHaveBeenCalledWith(
				'https://test-search.search.windows.net',
				expect.any(AzureKeyCredential),
			);

			// Verify deleteIndex was called with the correct index name
			expect(mockDeleteIndex).toHaveBeenCalledWith('test-index');

			// Verify debug log was called
			expect(mockLogger.debug).toHaveBeenCalledWith('Deleted Azure AI Search index: test-index');
		});

		it('should NOT delete index when clearIndex is false', async () => {
			mockContext.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'indexName':
						return 'test-index';
					case 'options':
						return { clearIndex: false };
					default:
						return undefined;
				}
			});

			const result = await clearAzureSearchIndex(mockContext, 0);

			// Verify the function returned false (index was not deleted)
			expect(result).toBe(false);

			// Verify SearchIndexClient was NOT instantiated
			expect(MockedSearchIndexClient).not.toHaveBeenCalled();

			// Verify deleteIndex was NOT called
			expect(mockDeleteIndex).not.toHaveBeenCalled();
		});

		it('should NOT delete index when clearIndex option is not provided', async () => {
			mockContext.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'indexName':
						return 'test-index';
					case 'options':
						return {};
					default:
						return undefined;
				}
			});

			const result = await clearAzureSearchIndex(mockContext, 0);

			// Verify the function returned false (index was not deleted)
			expect(result).toBe(false);

			// Verify SearchIndexClient was NOT instantiated
			expect(MockedSearchIndexClient).not.toHaveBeenCalled();

			// Verify deleteIndex was NOT called
			expect(mockDeleteIndex).not.toHaveBeenCalled();
		});

		it('should return false and log error when deleteIndex fails', async () => {
			mockContext.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'indexName':
						return 'test-index';
					case 'options':
						return { clearIndex: true };
					default:
						return undefined;
				}
			});

			// Make deleteIndex throw an error
			mockDeleteIndex.mockRejectedValueOnce(new Error('Index not found'));

			const result = await clearAzureSearchIndex(mockContext, 0);

			// Verify the function returned false (deletion failed gracefully)
			expect(result).toBe(false);

			// Verify the error was logged
			expect(mockLogger.debug).toHaveBeenCalledWith('Error deleting index (may not exist):', {
				message: 'Index not found',
			});
		});
	});

	describe('transformDocumentsForAzure', () => {
		it('should transform metadata into attributes array with specified keys', () => {
			const documents = [
				{
					pageContent: 'test content',
					metadata: {
						source: 'test.pdf',
						author: 'John Doe',
						category: 'tech',
						unused: 'field',
					},
				},
			];

			const result = transformDocumentsForAzure(documents, ['source', 'author']);

			expect(result[0].metadata.attributes).toEqual([
				{ key: 'source', value: 'test.pdf' },
				{ key: 'author', value: 'John Doe' },
			]);
			// Original metadata should be preserved
			expect(result[0].metadata.source).toBe('test.pdf');
			expect(result[0].metadata.author).toBe('John Doe');
			expect(result[0].metadata.category).toBe('tech');
			expect(result[0].metadata.unused).toBe('field');
		});

		it('should include all metadata keys when metadataKeysToInclude is empty', () => {
			const documents = [
				{
					pageContent: 'test content',
					metadata: { source: 'test.pdf', page: 1 },
				},
			];

			const result = transformDocumentsForAzure(documents, []);

			expect(result[0].metadata.attributes).toHaveLength(2);
			expect(result[0].metadata.attributes).toContainEqual({ key: 'source', value: 'test.pdf' });
			expect(result[0].metadata.attributes).toContainEqual({ key: 'page', value: '1' });
		});

		it('should filter out null and undefined values', () => {
			const documents = [
				{
					pageContent: 'test content',
					metadata: { source: 'test.pdf', author: null, page: undefined },
				},
			];

			const result = transformDocumentsForAzure(documents, []);

			expect(result[0].metadata.attributes).toEqual([{ key: 'source', value: 'test.pdf' }]);
		});

		it('should convert non-string values to strings', () => {
			const documents = [
				{
					pageContent: 'test content',
					metadata: { page: 42, isPublic: true, score: 0.95 },
				},
			];

			const result = transformDocumentsForAzure(documents, []);

			expect(result[0].metadata.attributes).toContainEqual({ key: 'page', value: '42' });
			expect(result[0].metadata.attributes).toContainEqual({ key: 'isPublic', value: 'true' });
			expect(result[0].metadata.attributes).toContainEqual({ key: 'score', value: '0.95' });
		});

		it('should skip keys that do not exist in metadata', () => {
			const documents = [
				{
					pageContent: 'test content',
					metadata: { source: 'test.pdf' },
				},
			];

			const result = transformDocumentsForAzure(documents, ['source', 'nonexistent']);

			expect(result[0].metadata.attributes).toEqual([{ key: 'source', value: 'test.pdf' }]);
		});

		it('should not mutate original documents', () => {
			const originalMetadata = { source: 'test.pdf' };
			const originalDoc = {
				pageContent: 'test content',
				metadata: originalMetadata,
			};
			const documents = [originalDoc];

			transformDocumentsForAzure(documents, []);

			expect(originalDoc.metadata).not.toHaveProperty('attributes');
			expect(originalMetadata).not.toHaveProperty('attributes');
		});

		it('should handle empty documents array', () => {
			const result = transformDocumentsForAzure([], []);
			expect(result).toEqual([]);
		});

		it('should handle documents with empty metadata', () => {
			const documents = [
				{
					pageContent: 'test content',
					metadata: {},
				},
			];

			const result = transformDocumentsForAzure(documents, []);

			expect(result[0].metadata.attributes).toEqual([]);
		});
	});
});
