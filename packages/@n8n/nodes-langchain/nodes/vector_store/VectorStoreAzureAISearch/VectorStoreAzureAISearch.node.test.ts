import { AzureAISearchVectorStore } from '@langchain/community/vectorstores/azure_aisearch';
import { DefaultAzureCredential } from '@azure/identity';
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { VectorStoreAzureAISearch } from './VectorStoreAzureAISearch.node';

jest.mock('@langchain/community/vectorstores/azure_aisearch');
jest.mock('@azure/identity');
jest.mock('@azure/search-documents');

describe('VectorStoreAzureAISearch', () => {
	const vectorStore = new VectorStoreAzureAISearch();
	const helpers = mock<ISupplyDataFunctions['helpers']>();
	const executeFunctions = mock<ISupplyDataFunctions>({ helpers });

	beforeEach(() => {
		jest.resetAllMocks();
		executeFunctions.addInputData.mockReturnValue({ index: 0 });
		(SearchClient as jest.Mock).mockImplementation(() => ({
			// Mock SearchClient instance
		}));
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
		expect(SearchClient).toHaveBeenCalledWith(
			'https://test-search.search.windows.net',
			'test-index',
			expect.any(AzureKeyCredential),
			{ userAgentOptions: { userAgentPrefix: 'n8n-azure-ai-search' } },
		);
		expect(AzureAISearchVectorStore).toHaveBeenCalledWith(mockEmbeddings, {
			indexName: 'test-index',
			search: {
				type: expect.any(String),
			},
			client: expect.any(Object),
		});
	});

	it('should get vector store client with system-assigned managed identity', async () => {
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
			authType: 'managedIdentitySystem',
			endpoint: 'https://test-search.search.windows.net',
		});

		const mockEmbeddings = {};
		executeFunctions.getInputConnectionData.mockResolvedValue(mockEmbeddings);

		const { response } = await vectorStore.supplyData.call(executeFunctions, 0);

		expect(response).toBeDefined();
		expect(DefaultAzureCredential).toHaveBeenCalledWith();
		expect(SearchClient).toHaveBeenCalledWith(
			'https://test-search.search.windows.net',
			'test-index',
			expect.any(DefaultAzureCredential),
			{ userAgentOptions: { userAgentPrefix: 'n8n-azure-ai-search' } },
		);
		expect(AzureAISearchVectorStore).toHaveBeenCalledWith(mockEmbeddings, {
			indexName: 'test-index',
			search: {
				type: expect.any(String),
			},
			client: expect.any(Object),
		});
	});

	it('should get vector store client with user-assigned managed identity', async () => {
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
			authType: 'managedIdentityUser',
			endpoint: 'https://test-search.search.windows.net',
			managedIdentityClientId: 'test-client-id',
		});

		const mockEmbeddings = {};
		executeFunctions.getInputConnectionData.mockResolvedValue(mockEmbeddings);

		const { response } = await vectorStore.supplyData.call(executeFunctions, 0);

		expect(response).toBeDefined();
		expect(DefaultAzureCredential).toHaveBeenCalledWith({
			managedIdentityClientId: 'test-client-id',
		});
		expect(SearchClient).toHaveBeenCalledWith(
			'https://test-search.search.windows.net',
			'test-index',
			expect.any(DefaultAzureCredential),
			{ userAgentOptions: { userAgentPrefix: 'n8n-azure-ai-search' } },
		);
		expect(AzureAISearchVectorStore).toHaveBeenCalledWith(mockEmbeddings, {
			indexName: 'test-index',
			search: {
				type: expect.any(String),
			},
			client: expect.any(Object),
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
						resultsCount: 25,
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
		expect(SearchClient).toHaveBeenCalledWith(
			'https://test-search.search.windows.net',
			'test-index',
			expect.any(AzureKeyCredential),
			{ userAgentOptions: { userAgentPrefix: 'n8n-azure-ai-search' } },
		);
		expect(AzureAISearchVectorStore).toHaveBeenCalledWith(mockEmbeddings, {
			indexName: 'test-index',
			search: {
				type: expect.any(String),
				filter: "category eq 'tech'",
				semanticConfigurationName: 'test-semantic-config',
			},
			client: expect.any(Object),
		});
	});
});
