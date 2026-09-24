import { AzureOpenAIEmbeddings, OpenAIEmbeddings } from '@langchain/openai';
import { getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { EmbeddingsAzureOpenAi } from '../EmbeddingsAzureOpenAi/EmbeddingsAzureOpenAi.node';

const tokenCredentialSpy = vi.fn();

// Records the constructor arguments but still derives the deployment from the credential it was
// given, so the other tests keep asserting real mapping rather than a fixed stub.
vi.mock('../../llms/LmChatAzureOpenAi/credentials/N8nOAuth2TokenCredential', () => ({
	N8nOAuth2TokenCredential: class N8nOAuth2TokenCredentialMock {
		private credential: Record<string, unknown> = {};

		constructor(...args: unknown[]) {
			tokenCredentialSpy(...args);
			this.credential = (args[1] ?? {}) as Record<string, unknown>;
		}

		getDeploymentDetails = async () => {
			const c = this.credential;
			if (c.endpointType === 'foundry') {
				return {
					apiVersion: c.apiVersion ?? '',
					endpoint: c.foundryEndpoint,
					resourceName: c.resourceName ?? '',
					endpointType: 'foundry' as const,
					foundryEndpoint: c.foundryEndpoint,
				};
			}
			return {
				apiVersion: c.apiVersion ?? '',
				endpoint: c.endpoint,
				resourceName: c.resourceName ?? '',
			};
		};
	},
}));

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

		it('should use OpenAIEmbeddings against the Foundry base URL', async () => {
			const mockContext = setupMockContext();
			const MockedOpenAIEmbeddings = vi.mocked(OpenAIEmbeddings);

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				endpointType: 'foundry',
				foundryEndpoint: 'https://test.services.ai.azure.com/openai/v1',
			});

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'text-embedding-3-large';
				if (paramName === 'options') return {};
				return undefined;
			});

			await embeddingsAzureOpenAi.supplyData.call(mockContext, 0);

			expect(MockedOpenAIEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'text-embedding-3-large',
					configuration: expect.objectContaining({
						baseURL: 'https://test.services.ai.azure.com/openai/v1',
					}),
				}),
			);
			expect(MockedAzureOpenAIEmbeddings).not.toHaveBeenCalled();
		});

		describe('with Entra ID', () => {
			const entraCredential = {
				clientId: 'client-id',
				clientSecret: 'client-secret',
				accessTokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/token',
				authentication: 'body',
				scope: '',
				tenantId: 'tenant',
			};

			const selectEntra = (context: Mocked<ISupplyDataFunctions>) => {
				context.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'authentication') return 'azureEntraCognitiveServicesOAuth2Api';
					if (paramName === 'model') return 'text-embedding-3-large';
					if (paramName === 'options') return {};
					return undefined;
				});
			};

			it('should pass a token provider to a classic deployment, and no API key', async () => {
				const mockContext = setupMockContext();
				mockContext.getCredentials.mockResolvedValue({
					...entraCredential,
					endpoint: 'https://test-resource-name.openai.azure.com',
					apiVersion: 'v1',
				});
				selectEntra(mockContext);

				await embeddingsAzureOpenAi.supplyData.call(mockContext, 0);

				expect(MockedAzureOpenAIEmbeddings).toHaveBeenCalledWith(
					expect.objectContaining({
						azureADTokenProvider: expect.any(Function),
						azureOpenAIApiKey: undefined,
						azureOpenAIBasePath: 'https://test-resource-name.openai.azure.com/openai/deployments',
					}),
				);
			});

			// A function, not an awaited string: the client calls it per request, so a long run never
			// sends a token that has since expired.
			it('should pass a token provider as the Foundry apiKey, not a resolved string', async () => {
				const mockContext = setupMockContext();
				const MockedOpenAIEmbeddings = vi.mocked(OpenAIEmbeddings);
				mockContext.getCredentials.mockResolvedValue({
					...entraCredential,
					endpointType: 'foundry',
					foundryEndpoint: 'https://test.services.ai.azure.com/openai/v1',
				});
				selectEntra(mockContext);

				await embeddingsAzureOpenAi.supplyData.call(mockContext, 0);

				const config = MockedOpenAIEmbeddings.mock.calls[0][0];
				expect(typeof config?.apiKey).toBe('function');
				expect(config?.model).toBe('text-embedding-3-large');
				expect(config?.configuration).toEqual(
					expect.objectContaining({ baseURL: 'https://test.services.ai.azure.com/openai/v1' }),
				);
				expect(MockedAzureOpenAIEmbeddings).not.toHaveBeenCalled();
			});

			// With no endpoint the host has to come from the resource name.
			it('should resolve the proxy against the resource host when no endpoint is set', async () => {
				const mockContext = setupMockContext();
				mockContext.getCredentials.mockResolvedValue({
					...entraCredential,
					resourceName: 'my-resource',
					apiVersion: 'v1',
				});
				selectEntra(mockContext);

				await embeddingsAzureOpenAi.supplyData.call(mockContext, 0);

				expect(vi.mocked(getProxyAgent)).toHaveBeenCalledWith(
					'https://my-resource.openai.azure.com',
					expect.any(Object),
					expect.any(Object),
				);
			});

			// The mint posts the client secret to a stored URL, so it runs inside the egress policy,
			// as the chat model node's does.
			it('should hand the egress filter to the token credential', async () => {
				const mockContext = setupMockContext();
				mockContext.getCredentials.mockResolvedValue({
					...entraCredential,
					resourceName: 'my-resource',
					apiVersion: 'v1',
				});
				selectEntra(mockContext);

				await embeddingsAzureOpenAi.supplyData.call(mockContext, 0);

				expect(tokenCredentialSpy).toHaveBeenCalledWith(
					expect.anything(),
					expect.anything(),
					undefined,
					mockContext.helpers.getSecureEgressFilter(),
				);
			});

			it('should read the Entra credential, not the API key one', async () => {
				const mockContext = setupMockContext();
				mockContext.getCredentials.mockResolvedValue({
					...entraCredential,
					endpoint: 'https://test-resource-name.openai.azure.com',
					apiVersion: 'v1',
				});
				selectEntra(mockContext);

				await embeddingsAzureOpenAi.supplyData.call(mockContext, 0);

				expect(mockContext.getCredentials).toHaveBeenCalledWith(
					'azureEntraCognitiveServicesOAuth2Api',
				);
				expect(mockContext.getCredentials).not.toHaveBeenCalledWith('azureOpenAiApi');
			});
		});

		// Existing nodes have no `authentication` parameter stored. The Workflow constructor fills
		// this default into node.parameters, and getCredentials gates the API key credential on it,
		// so changing it would point every saved node at a credential it does not have.
		it('should default authentication to the API key, for nodes saved before the selector', () => {
			const authentication = new EmbeddingsAzureOpenAi().description.properties.find(
				(p) => p.name === 'authentication',
			);

			expect(authentication?.default).toBe('azureOpenAiApi');
		});

		it.each([
			[
				'no resource name or endpoint',
				{ apiKey: 'test-api-key', apiVersion: 'v1' },
				'Resource Name is missing in the selected Azure OpenAI API credential.',
			],
			[
				'no API version',
				{ apiKey: 'test-api-key', resourceName: 'my-resource' },
				'API Version is missing in the selected Azure OpenAI API credential.',
			],
		])(
			'should say which field is missing when a classic credential has %s',
			async (_, credential, message) => {
				const mockContext = setupMockContext();
				mockContext.getCredentials.mockResolvedValue(credential);
				mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'text-embedding-3-large';
					if (paramName === 'options') return {};
					return undefined;
				});

				await expect(embeddingsAzureOpenAi.supplyData.call(mockContext, 0)).rejects.toThrow(
					message,
				);
			},
		);

		it('should reject a Foundry credential that has no endpoint', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				endpointType: 'foundry',
				foundryEndpoint: '   ',
			});

			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'text-embedding-3-large';
				if (paramName === 'options') return {};
				return undefined;
			});

			await expect(embeddingsAzureOpenAi.supplyData.call(mockContext, 0)).rejects.toThrow(
				'Foundry endpoint is missing in the selected Azure OpenAI API credential.',
			);
		});
	});
});
