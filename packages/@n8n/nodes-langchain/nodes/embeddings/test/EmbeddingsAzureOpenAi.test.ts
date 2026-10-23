import { AzureOpenAIEmbeddings, OpenAIEmbeddings } from '@langchain/openai';
import { aiClientFetch, getProxyAgent } from '@n8n/ai-utilities';
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

describe('EmbeddingsAzureOpenAi node identity', () => {
	const { description } = new EmbeddingsAzureOpenAi();

	it('should be labelled Microsoft Foundry Embeddings', () => {
		expect(description.displayName).toBe('Microsoft Foundry Embeddings');
		expect(description.defaults.name).toBe('Microsoft Foundry Embeddings');
	});

	// A saved workflow resolves its nodes by type, so the rename is only safe while this is untouched.
	it('should keep the node type, which saved workflows resolve by', () => {
		expect(description.name).toBe('embeddingsAzureOpenAi');
	});

	it.each([
		'Azure',
		'Azure OpenAI',
		'Embeddings Azure OpenAI',
		'Azure AI Foundry',
		'Foundry',
		'AOAI',
	])('should be findable by %s', (term) => {
		expect(description.codex?.alias).toContain(term);
	});
});

describe('AzureOpenAIEmbeddings', () => {
	let embeddingsAzureOpenAi: EmbeddingsAzureOpenAi;
	let mockContext: Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Microsoft Foundry Embeddings',
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
						fetch: aiClientFetch,
						fetchOptions: {
							dispatcher: expect.any(MockProxyAgent),
						},
					},
				}),
			);
		});

		describe('credential domain restrictions', () => {
			const restricted = {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'allowed.example.com',
			};

			it.each([
				[
					'a Foundry endpoint',
					{ endpointType: 'foundry', foundryEndpoint: 'https://evil.example.com/openai/v1' },
				],
				['a classic endpoint', { endpoint: 'https://evil.example.com', apiVersion: 'v1' }],
				['a resource-derived classic host', { resourceName: 'evil', apiVersion: 'v1' }],
			])('refuses to send the token to %s outside the allowed domains', async (_name, target) => {
				const mockContext = setupMockContext();
				mockContext.getCredentials.mockResolvedValue({
					apiKey: 'test-api-key',
					...restricted,
					...target,
				});
				mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'text-embedding-3-large';
					if (paramName === 'options') return {};
					return undefined;
				});

				await expect(embeddingsAzureOpenAi.supplyData.call(mockContext, 0)).rejects.toThrow(
					'Domain not allowed',
				);
			});

			// 'none' means "do not use this credential in the HTTP Request node". The editor
			// writes it into every credential made through its OAuth flow, so blocking on it
			// here would stop the node the credential belongs to.
			it.each([
				[
					'a Foundry endpoint',
					{
						endpointType: 'foundry',
						foundryEndpoint: 'https://test.services.ai.azure.com/openai/v1',
					},
				],
				[
					'a classic endpoint',
					{ endpoint: 'https://test-resource-name.openai.azure.com', apiVersion: 'v1' },
				],
			])('still reaches %s when the restriction is None', async (_name, target) => {
				const mockContext = setupMockContext();
				mockContext.getCredentials.mockResolvedValue({
					apiKey: 'test-api-key',
					allowedHttpRequestDomains: 'none',
					...target,
				});
				mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'text-embedding-3-large';
					if (paramName === 'options') return {};
					return undefined;
				});

				await expect(embeddingsAzureOpenAi.supplyData.call(mockContext, 0)).resolves.toBeDefined();
			});

			it('allows a host the credential permits', async () => {
				const mockContext = setupMockContext();
				mockContext.getCredentials.mockResolvedValue({
					apiKey: 'test-api-key',
					...restricted,
					endpointType: 'foundry',
					foundryEndpoint: 'https://allowed.example.com/openai/v1',
				});
				mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'text-embedding-3-large';
					if (paramName === 'options') return {};
					return undefined;
				});

				await expect(embeddingsAzureOpenAi.supplyData.call(mockContext, 0)).resolves.toBeDefined();
			});
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
						fetch: aiClientFetch,
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

			// The Entra branch is the one this PR adds the egress check to, so it needs its own
			// cases. The API-key copies cannot cover it: they dial a different code path.
			describe('credential domain restrictions', () => {
				const restricted = {
					allowedHttpRequestDomains: 'domains',
					allowedDomains: 'allowed.example.com',
				};

				it.each([
					[
						'a Foundry endpoint',
						{ endpointType: 'foundry', foundryEndpoint: 'https://evil.example.com/openai/v1' },
					],
					['a classic endpoint', { endpoint: 'https://evil.example.com', apiVersion: 'v1' }],
					['a resource-derived classic host', { resourceName: 'evil', apiVersion: 'v1' }],
				])('refuses to send the token to %s outside the allowed domains', async (_name, target) => {
					const mockContext = setupMockContext();
					mockContext.getCredentials.mockResolvedValue({
						...entraCredential,
						...restricted,
						...target,
					});
					selectEntra(mockContext);

					await expect(embeddingsAzureOpenAi.supplyData.call(mockContext, 0)).rejects.toThrow(
						'Domain not allowed',
					);
				});

				// 'none' means "do not use this credential in the HTTP Request node". The editor
				// writes it into every credential made through its OAuth flow, so blocking on it
				// here would stop the node the credential belongs to.
				it.each([
					[
						'a Foundry endpoint',
						{
							endpointType: 'foundry',
							foundryEndpoint: 'https://test.services.ai.azure.com/openai/v1',
						},
					],
					[
						'a classic endpoint',
						{ endpoint: 'https://test-resource-name.openai.azure.com', apiVersion: 'v1' },
					],
				])('still reaches %s when the restriction is None', async (_name, target) => {
					const mockContext = setupMockContext();
					mockContext.getCredentials.mockResolvedValue({
						...entraCredential,
						allowedHttpRequestDomains: 'none',
						...target,
					});
					selectEntra(mockContext);

					await expect(
						embeddingsAzureOpenAi.supplyData.call(mockContext, 0),
					).resolves.toBeDefined();
				});

				it('allows a host the credential permits', async () => {
					const mockContext = setupMockContext();
					mockContext.getCredentials.mockResolvedValue({
						...entraCredential,
						...restricted,
						endpointType: 'foundry',
						foundryEndpoint: 'https://allowed.example.com/openai/v1',
					});
					selectEntra(mockContext);

					await expect(
						embeddingsAzureOpenAi.supplyData.call(mockContext, 0),
					).resolves.toBeDefined();
				});
			});

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

			// The host has to come from the resource name whether the endpoint is absent or blank.
			// The blank case is the one that needs `||`: an empty string is falsy but not nullish,
			// so `??` would pass it straight through to the proxy.
			it.each([
				['absent', {}],
				['blank', { endpoint: '' }],
			])(
				'should resolve the proxy against the resource host when the endpoint is %s',
				async (_, endpoint) => {
					const mockContext = setupMockContext();
					mockContext.getCredentials.mockResolvedValue({
						...entraCredential,
						...endpoint,
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
				},
			);

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
				'Resource Name is missing in the selected Microsoft Foundry (API Key) credential.',
			],
			[
				'no API version',
				{ apiKey: 'test-api-key', resourceName: 'my-resource' },
				'API Version is missing in the selected Microsoft Foundry (API Key) credential.',
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
				'Foundry endpoint is missing in the selected Microsoft Foundry (API Key) credential.',
			);
		});
	});
});
