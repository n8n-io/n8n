/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/unbound-method */
import { AzureOpenAIEmbeddings } from '@langchain/openai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { EmbeddingsAzureOpenAi } from '../EmbeddingsAzureOpenAi/EmbeddingsAzureOpenAi.node';

jest.mock('@langchain/openai');

class MockProxyAgent {}

jest.mock('@n8n/ai-utilities', () => ({
	logWrapper: jest.fn().mockImplementation(() => jest.fn()),
	getProxyAgent: jest.fn().mockImplementation(() => new MockProxyAgent()),
}));

const MockedAzureOpenAIEmbeddings = jest.mocked(AzureOpenAIEmbeddings);

describe('AzureOpenAIEmbeddings', () => {
	let embeddingsAzureOpenAi: EmbeddingsAzureOpenAi;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Embeddings Azure OpenAI',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.embeddingsAzureOpenAi',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (nodeOverrides: Partial<INode> = {}) => {
		const node = { ...mockNode, ...nodeOverrides };
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			node,
		) as jest.Mocked<ISupplyDataFunctions>;

		// Setup default mocks
		mockContext.getCredentials = jest.fn().mockResolvedValue({
			apiKey: 'test-api-key',
		});
		mockContext.getNode = jest.fn().mockReturnValue(node);
		mockContext.getNodeParameter = jest.fn();
		mockContext.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
		return mockContext;
	};

	beforeEach(() => {
		embeddingsAzureOpenAi = new EmbeddingsAzureOpenAi();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('supplyData', () => {
		it('dispatcher should get proxy agent', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				endpoint: 'https://test-resource-name.openai.azure.com',
				apiVersion: 'v1',
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'text-embedding-3-large';
				if (paramName === 'options') return {};
				return undefined;
			});

			await embeddingsAzureOpenAi.supplyData.call(mockContext, 0);

			expect(MockedAzureOpenAIEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					azureOpenAIApiDeploymentName: 'text-embedding-3-large',
					azureOpenAIApiInstanceName: undefined,
					azureOpenAIApiKey: 'test-api-key',
					azureOpenAIApiVersion: 'v1',
					azureOpenAIBasePath: 'https://test-resource-name.openai.azure.com/openai/deployments',
					configuration: {
						fetchOptions: {
							dispatcher: expect.any(MockProxyAgent),
						},
					},
				}),
			);
		});
	});
});
