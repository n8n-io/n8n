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
});
