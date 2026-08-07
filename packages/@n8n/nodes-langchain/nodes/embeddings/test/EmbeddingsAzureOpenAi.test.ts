import { AzureOpenAIEmbeddings } from '@langchain/openai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { EmbeddingsAzureOpenAi } from '../EmbeddingsAzureOpenAi/EmbeddingsAzureOpenAi.node';

vi.mock('@langchain/openai');

class MockProxyAgent {}

vi.mock('@n8n/ai-utilities', async () => {
	const actual = await vi.importActual('@n8n/ai-utilities');
	return {
		...actual,
		logWrapper: vi.fn().mockImplementation(() => vi.fn()),
		getProxyAgent: vi.fn().mockImplementation(() => new MockProxyAgent()),
	};
});

const MockedAzureOpenAIEmbeddings = vi.mocked(AzureOpenAIEmbeddings);

describe('AzureOpenAIEmbeddings', () => {
	let embeddingsAzureOpenAi: EmbeddingsAzureOpenAi;
	let mockContext: Mocked<ISupplyDataFunctions>;

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
		) as Mocked<ISupplyDataFunctions>;

		// Setup default mocks
		mockContext.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-api-key',
		});
		mockContext.getNode = vi.fn().mockReturnValue(node);
		// @ts-expect-error - Mocking
		mockContext.getNodeParameter = vi.fn();
		mockContext.logger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};
		return mockContext;
	};

	beforeEach(() => {
		embeddingsAzureOpenAi = new EmbeddingsAzureOpenAi();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('supplyData', () => {
		it('dispatcher should get proxy agent', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				endpoint: 'https://test-resource-name.openai.azure.com',
				apiVersion: 'v1',
			});

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
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
