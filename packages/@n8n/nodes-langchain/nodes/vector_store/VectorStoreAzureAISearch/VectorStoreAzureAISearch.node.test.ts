import { AzureAISearchVectorStore } from '@langchain/community/vectorstores/azure_aisearch';
import { AzureKeyCredential } from '@azure/search-documents';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';

import { VectorStoreAzureAISearch, getIndexName } from './VectorStoreAzureAISearch.node';

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
});
