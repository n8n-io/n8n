/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable n8n-nodes-base/node-param-description-lowercase-first-char */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { ILoadOptionsFunctions, INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatDatabricks } from '../LmChatDatabricks.node';
import {
	CHAT_MODEL_USER_AGENT,
	createDatabricksFetch,
	getDatabricksTokenProvider,
} from '../token-provider';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');
vi.mock('../token-provider');

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);
const mockedGetDatabricksTokenProvider = vi.mocked(getDatabricksTokenProvider);
const mockedCreateDatabricksFetch = vi.mocked(createDatabricksFetch);

const mockTokenProvider = vi.fn(async () => 'test-token');
const mockFetch = vi.fn() as unknown as typeof fetch;

const mockCredential = {
	host: 'https://my.databricks.com/',
	grantType: 'clientCredentials',
	clientId: 'test-client-id',
	clientSecret: 'test-client-secret',
	accessTokenUrl: 'https://my.databricks.com/oidc/v1/token',
	scope: 'all-apis',
	authentication: 'header',
};

describe('LmChatDatabricks', () => {
	let node: LmChatDatabricks;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Databricks Chat Model',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.lmChatDatabricks',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (credentialOverrides: Partial<typeof mockCredential> = {}) => {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNodeDef,
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({ ...mockCredential, ...credentialOverrides });
		ctx.getNode = vi.fn().mockReturnValue(mockNodeDef);
		ctx.helpers.getSecureEgressFilter = vi.fn().mockReturnValue(undefined);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'my-chat-endpoint';
			if (paramName === 'options') return {};
			return undefined;
		});

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		mockedGetDatabricksTokenProvider.mockReturnValue(mockTokenProvider);
		mockedCreateDatabricksFetch.mockReturnValue(mockFetch);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatDatabricks();
		vi.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'Databricks Chat Model',
				name: 'lmChatDatabricks',
				group: ['transform'],
				version: [1],
				hidden: true,
				credentials: [{ name: 'databricksOAuth2Api', required: true }],
				outputs: ['ai_languageModel'],
				outputNames: ['Model'],
			});
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI with basic configuration', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('databricksOAuth2Api');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'databricks-oauth',
					model: 'my-chat-endpoint',
					maxRetries: 2,
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});

		it('should strip the trailing slash from the host in baseURL', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			const callArgs = MockedChatOpenAI.mock.calls[0][0];
			expect(callArgs?.configuration?.baseURL).toBe('https://my.databricks.com/serving-endpoints');
		});

		it('should wire the token-provider fetch wrapper into ChatOpenAI', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(mockedGetDatabricksTokenProvider).toHaveBeenCalledWith(
				mockNodeDef,
				mockCredential,
				undefined,
			);
			expect(mockedCreateDatabricksFetch).toHaveBeenCalledWith(mockTokenProvider, undefined);
			const callArgs = MockedChatOpenAI.mock.calls[0][0];
			expect(callArgs?.configuration?.fetch).toBe(mockFetch);
		});

		it('should thread the egress filter into the token provider and proxy agent', async () => {
			const ctx = setupMockContext();
			const secureLookup = vi.fn();
			const egressFilter = {
				validateUrl: vi.fn(),
				validateRedirectSync: vi.fn(),
				createSecureLookup: vi.fn().mockReturnValue(secureLookup),
			};
			ctx.helpers.getSecureEgressFilter = vi.fn().mockReturnValue(egressFilter);

			await node.supplyData.call(ctx, 0);

			expect(mockedGetDatabricksTokenProvider).toHaveBeenCalledWith(
				mockNodeDef,
				mockCredential,
				egressFilter,
			);
			expect(mockedCreateDatabricksFetch).toHaveBeenCalledWith(mockTokenProvider, egressFilter);
			expect(mockedGetProxyAgent).toHaveBeenCalledWith(
				'https://my.databricks.com/serving-endpoints',
				expect.any(Object),
				secureLookup,
			);
		});

		it('should read the model via resourceLocator value extraction', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(ctx.getNodeParameter).toHaveBeenCalledWith('model', 0, '', { extractValue: true });
		});

		it('should pass options to ChatOpenAI', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'my-chat-endpoint';
				if (paramName === 'options')
					return {
						temperature: 0.5,
						maxTokens: 2000,
						topP: 0.9,
						frequencyPenalty: 0.3,
						presencePenalty: 0.2,
						timeout: 60000,
						maxRetries: 5,
					};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					temperature: 0.5,
					maxTokens: 2000,
					topP: 0.9,
					frequencyPenalty: 0.3,
					presencePenalty: 0.2,
					timeout: 60000,
					maxRetries: 5,
				}),
			);
		});

		it('should set response_format in modelKwargs when responseFormat is provided', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'my-chat-endpoint';
				if (paramName === 'options') return { responseFormat: 'json_object' };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: { response_format: { type: 'json_object' } },
				}),
			);
		});

		it('should reject authorizationCode credentials', async () => {
			const ctx = setupMockContext({ grantType: 'authorizationCode' });

			await expect(node.supplyData.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(MockedChatOpenAI).not.toHaveBeenCalled();
		});

		it('should reject non-https hosts', async () => {
			const ctx = setupMockContext({ host: 'http://my.databricks.com' });

			await expect(node.supplyData.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(MockedChatOpenAI).not.toHaveBeenCalled();
		});

		it('should accept an uppercase HTTPS scheme', async () => {
			const ctx = setupMockContext({ host: 'HTTPS://my.databricks.com' });

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalled();
		});
	});

	describe('searchModels', () => {
		const endpointsResponse = {
			endpoints: [
				{
					name: 'chat-endpoint',
					task: 'llm/v1/chat',
					config: { served_entities: [{ foundation_model: { name: 'llama-3' } }] },
				},
				{ name: 'embeddings-endpoint', task: 'llm/v1/embeddings' },
				{
					name: 'agent-endpoint',
					task: 'agent/v1/chat',
					config: { served_entities: [{ external_model: { name: 'gpt-4o' } }] },
				},
				{ name: 'custom-endpoint' },
			],
		};

		let mockContext: Mocked<ILoadOptionsFunctions>;
		let httpRequestWithAuthentication: ReturnType<typeof vi.fn>;

		const setupSearchContext = (host: string, response: unknown) => {
			httpRequestWithAuthentication = vi.fn().mockResolvedValue(response);
			mockContext = {
				getCredentials: vi.fn().mockResolvedValue({ ...mockCredential, host }),
				getNode: vi.fn().mockReturnValue(mockNodeDef),
				helpers: { httpRequestWithAuthentication },
			} as unknown as Mocked<ILoadOptionsFunctions>;
		};

		it('should reject non-https hosts before requesting the endpoint list', async () => {
			setupSearchContext('http://my.databricks.com', endpointsResponse);

			await expect(node.methods.listSearch.searchModels.call(mockContext)).rejects.toThrow(
				'Databricks host must use https',
			);
			expect(httpRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should list only chat-capable endpoints', async () => {
			setupSearchContext('https://my.databricks.com', endpointsResponse);

			const result = await node.methods.listSearch.searchModels.call(mockContext);

			expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
				'databricksOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					url: 'https://my.databricks.com/api/2.0/serving-endpoints',
				}),
			);
			expect(result.results).toEqual([
				{
					name: 'chat-endpoint',
					value: 'chat-endpoint',
					url: 'https://my.databricks.com/ml/endpoints/chat-endpoint',
					description: 'llama-3',
				},
				{
					name: 'agent-endpoint',
					value: 'agent-endpoint',
					url: 'https://my.databricks.com/ml/endpoints/agent-endpoint',
					description: 'gpt-4o',
				},
			]);
		});

		it('should apply the substring filter', async () => {
			setupSearchContext('https://my.databricks.com', endpointsResponse);

			const result = await node.methods.listSearch.searchModels.call(mockContext, 'agent');

			expect(result.results).toEqual([expect.objectContaining({ name: 'agent-endpoint' })]);
		});

		it('should return no results when the response has no endpoints field', async () => {
			setupSearchContext('https://my.databricks.com', {});

			const result = await node.methods.listSearch.searchModels.call(mockContext);

			expect(result).toEqual({ results: [] });
		});

		it('should strip the trailing slash from the host in the request URL', async () => {
			setupSearchContext('https://my.databricks.com/', endpointsResponse);

			await node.methods.listSearch.searchModels.call(mockContext);

			const [, requestOptions] = httpRequestWithAuthentication.mock.calls[0];
			expect(requestOptions.url).toBe('https://my.databricks.com/api/2.0/serving-endpoints');
		});

		it('should send the partner User-Agent on the endpoints listing request', async () => {
			setupSearchContext('https://my.databricks.com', endpointsResponse);

			await node.methods.listSearch.searchModels.call(mockContext);

			const [, requestOptions] = httpRequestWithAuthentication.mock.calls[0];
			expect(requestOptions.headers).toMatchObject({ 'User-Agent': CHAT_MODEL_USER_AGENT });
		});
	});
});
