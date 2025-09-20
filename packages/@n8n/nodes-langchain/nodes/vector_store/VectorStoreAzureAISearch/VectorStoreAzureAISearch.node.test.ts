import { AzureAISearchVectorStore } from '@langchain/community/vectorstores/azure_aisearch';
import { DefaultAzureCredential } from '@azure/identity';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { VectorStoreAzureAISearch } from './VectorStoreAzureAISearch.node';

jest.mock('@langchain/community/vectorstores/azure_aisearch');
jest.mock('@azure/identity');

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
			key: 'test-api-key',
			search: {
				type: expect.any(String),
			},
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
		expect(AzureAISearchVectorStore).toHaveBeenCalledWith(mockEmbeddings, {
			endpoint: 'https://test-search.search.windows.net',
			indexName: 'test-index',
			credentials: expect.any(Object),
			search: {
				type: expect.any(String),
			},
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
		expect(AzureAISearchVectorStore).toHaveBeenCalledWith(mockEmbeddings, {
			endpoint: 'https://test-search.search.windows.net',
			indexName: 'test-index',
			credentials: expect.any(Object),
			search: {
				type: expect.any(String),
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
		expect(AzureAISearchVectorStore).toHaveBeenCalledWith(mockEmbeddings, {
			endpoint: 'https://test-search.search.windows.net',
			indexName: 'test-index',
			key: 'test-api-key',
			search: {
				type: expect.any(String),
				filter: "category eq 'tech'",
				semanticConfiguration: 'test-semantic-config',
			},
		});
	});
});
