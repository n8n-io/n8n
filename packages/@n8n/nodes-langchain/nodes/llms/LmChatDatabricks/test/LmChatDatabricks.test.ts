/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable n8n-nodes-base/node-param-description-lowercase-first-char */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import {
	createRefreshingAuthFetch,
	makeN8nLlmFailedAttemptHandler,
	getProxyAgent,
} from '@n8n/ai-utilities';
import { DATABRICKS_PARTNER_USER_AGENT } from 'n8n-nodes-base/dist/nodes/Databricks/constants';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { ILoadOptionsFunctions, INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatDatabricks } from '../LmChatDatabricks.node';
import { getDatabricksTokenProvider } from '../token-provider';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');
vi.mock('../token-provider');

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);
const mockedGetDatabricksTokenProvider = vi.mocked(getDatabricksTokenProvider);
const mockedCreateRefreshingAuthFetch = vi.mocked(createRefreshingAuthFetch);

const mockTokenProvider = {
	getToken: vi.fn(async () => 'test-token'),
	refreshAfterRejection: vi.fn(async () => null as string | null),
	expiredStatus: 403,
};
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
		mockedCreateRefreshingAuthFetch.mockReturnValue(mockFetch);
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
			expect(callArgs?.configuration?.baseURL).toBe(
				'https://my.databricks.com/ai-gateway/openai/v1',
			);
		});

		it('should wire the refreshing fetch into ChatOpenAI', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(mockedGetDatabricksTokenProvider).toHaveBeenCalledWith(ctx, mockCredential, undefined);
			const callArgs = MockedChatOpenAI.mock.calls[0][0];
			// The refreshing fetch sits behind the error-reshaping wrapper
			const body = JSON.stringify({ choices: [] });
			vi.mocked(mockFetch).mockResolvedValue(new Response(body, { status: 200 }));
			const response = await callArgs?.configuration?.fetch?.('https://my.databricks.com/x');
			expect(mockFetch).toHaveBeenCalledWith('https://my.databricks.com/x', undefined);
			expect(await response?.text()).toBe(body);
		});

		it('should retry on the expiry status the credential declares, not the default 401', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			const [fetchOptions] = mockedCreateRefreshingAuthFetch.mock.calls[0];
			expect(fetchOptions.expiredStatus).toBe(403);
		});

		it('should send the bearer and the partner User-Agent on every request', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			const [fetchOptions] = mockedCreateRefreshingAuthFetch.mock.calls[0];
			// Resolved per request, so a token minted mid-execution is picked up
			const headers = new Headers(await fetchOptions.resolveHeaders?.());
			expect(headers.get('authorization')).toBe('Bearer test-token');
			expect(headers.get('user-agent')).toBe(DATABRICKS_PARTNER_USER_AGENT);
		});

		it('should re-authorize with the rotated token after a rejection', async () => {
			const ctx = setupMockContext();
			mockTokenProvider.refreshAfterRejection.mockResolvedValue('rotated-token');

			await node.supplyData.call(ctx, 0);

			const [fetchOptions] = mockedCreateRefreshingAuthFetch.mock.calls[0];
			const headers = new Headers((await fetchOptions.refreshHeaders?.(new Headers())) ?? {});
			expect(headers.get('authorization')).toBe('Bearer rotated-token');
			expect(headers.get('user-agent')).toBe(DATABRICKS_PARTNER_USER_AGENT);
		});

		it('should not re-authorize when the session cannot be refreshed', async () => {
			const ctx = setupMockContext();
			mockTokenProvider.refreshAfterRejection.mockResolvedValue(null);

			await node.supplyData.call(ctx, 0);

			const [fetchOptions] = mockedCreateRefreshingAuthFetch.mock.calls[0];
			await expect(fetchOptions.refreshHeaders?.(new Headers())).resolves.toBeNull();
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
				ctx,
				mockCredential,
				egressFilter,
			);
			expect(mockedGetProxyAgent).toHaveBeenCalledWith(
				'https://my.databricks.com/ai-gateway/openai/v1',
				expect.any(Object),
				secureLookup,
			);

			// Every redirect hop is checked before the bearer is sent to it
			const [fetchOptions] = mockedCreateRefreshingAuthFetch.mock.calls[0];
			egressFilter.validateUrl.mockResolvedValue({ ok: true });
			await fetchOptions.assertAllowedUrl?.('https://my.databricks.com/serving-endpoints');
			expect(egressFilter.validateUrl).toHaveBeenCalledWith(
				'https://my.databricks.com/serving-endpoints',
			);
		});

		it('should reject a redirect hop the egress filter denies', async () => {
			const ctx = setupMockContext();
			const denied = new Error('blocked host');
			const egressFilter = {
				validateUrl: vi.fn().mockResolvedValue({ ok: false, error: denied }),
				validateRedirectSync: vi.fn(),
				createSecureLookup: vi.fn(),
			};
			ctx.helpers.getSecureEgressFilter = vi.fn().mockReturnValue(egressFilter);

			await node.supplyData.call(ctx, 0);

			const [fetchOptions] = mockedCreateRefreshingAuthFetch.mock.calls[0];
			await expect(fetchOptions.assertAllowedUrl?.('http://169.254.169.254/')).rejects.toBe(denied);
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

		it('should accept authorizationCode credentials', async () => {
			const ctx = setupMockContext({ grantType: 'authorizationCode' });

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalled();
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
		const modelServicesResponse = {
			model_services: [
				{
					name: 'model-services/system.ai.gpt-oss-120b',
					comment: 'OpenAI gpt-oss 120B',
					supported_api_types: ['mlflow/v1/chat/completions'],
				},
				{
					name: 'model-services/system.ai.gte-large-en',
					supported_api_types: ['mlflow/v1/embeddings'],
				},
				{
					name: 'model-services/main.ml.custom-route',
					supported_api_types: ['openai/v1/chat/completions'],
				},
				{ name: 'model-services/main.ml.untyped' },
			],
		};
		const [chatService, embeddingsService, customRouteService] =
			modelServicesResponse.model_services;

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

		it('should reject non-https hosts before requesting the model service list', async () => {
			setupSearchContext('http://my.databricks.com', modelServicesResponse);

			await expect(node.methods.listSearch.searchModels.call(mockContext)).rejects.toThrow(
				'Databricks host must use https',
			);
			expect(httpRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should list chat-capable model services without the resource prefix', async () => {
			setupSearchContext('https://my.databricks.com', modelServicesResponse);

			const result = await node.methods.listSearch.searchModels.call(mockContext);

			expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
				'databricksOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					url: 'https://my.databricks.com/api/2.1/unity-catalog/model-services',
					qs: expect.objectContaining({ view: 'FULL' }),
				}),
			);
			expect(result.results).toStrictEqual([
				{
					name: 'system.ai.gpt-oss-120b',
					value: 'system.ai.gpt-oss-120b',
					description: 'OpenAI gpt-oss 120B',
				},
				{
					name: 'main.ml.custom-route',
					value: 'main.ml.custom-route',
					description: undefined,
				},
			]);
		});

		it('should follow next_page_token until the last page', async () => {
			setupSearchContext('https://my.databricks.com', {});
			httpRequestWithAuthentication
				.mockReset()
				.mockResolvedValueOnce({ model_services: [chatService], next_page_token: 'p2' })
				.mockResolvedValueOnce({ model_services: [customRouteService] });

			const result = await node.methods.listSearch.searchModels.call(mockContext);

			expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
			const calls = httpRequestWithAuthentication.mock.calls;
			expect(calls[0][1].qs.page_token).toBeUndefined();
			expect(calls[1][1].qs.page_token).toBe('p2');
			expect(result.results.map((r) => r.value)).toEqual([
				'system.ai.gpt-oss-120b',
				'main.ml.custom-route',
			]);
		});

		it('should apply the substring filter to the name', async () => {
			setupSearchContext('https://my.databricks.com', modelServicesResponse);

			const result = await node.methods.listSearch.searchModels.call(mockContext, 'system');

			expect(result.results).toEqual([expect.objectContaining({ name: 'system.ai.gpt-oss-120b' })]);
		});

		it('should apply the substring filter to the description, case-insensitively', async () => {
			setupSearchContext('https://my.databricks.com', modelServicesResponse);

			const result = await node.methods.listSearch.searchModels.call(mockContext, 'openai');

			expect(result.results).toEqual([expect.objectContaining({ name: 'system.ai.gpt-oss-120b' })]);
		});

		it('should return no results, not an error, when the filter matches nothing', async () => {
			setupSearchContext('https://my.databricks.com', modelServicesResponse);

			const result = await node.methods.listSearch.searchModels.call(mockContext, 'nomatch');

			expect(result).toEqual({ results: [] });
		});

		it.each([{}, { model_services: [] }])(
			'should throw when the workspace has no model services (%o)',
			async (response) => {
				setupSearchContext('https://my.databricks.com', response);

				await expect(node.methods.listSearch.searchModels.call(mockContext)).rejects.toThrow(
					'No model services found',
				);
			},
		);

		it('should throw when no model service is chat-capable', async () => {
			setupSearchContext('https://my.databricks.com', { model_services: [embeddingsService] });

			await expect(node.methods.listSearch.searchModels.call(mockContext)).rejects.toThrow(
				'No chat-capable model services found',
			);
		});

		it('should stop after 50 pages', async () => {
			setupSearchContext('https://my.databricks.com', {
				model_services: [chatService],
				next_page_token: 'again',
			});

			await expect(node.methods.listSearch.searchModels.call(mockContext)).rejects.toThrow(
				'exceeded 50 pages',
			);
			expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(50);
		});

		it('should retry scoped to system.ai when the unscoped list is rejected with 400', async () => {
			setupSearchContext('https://my.databricks.com', modelServicesResponse);
			httpRequestWithAuthentication
				.mockReset()
				.mockRejectedValueOnce(new NodeApiError(mockNodeDef, {}, { httpCode: '400' }))
				.mockResolvedValueOnce({ model_services: [chatService] });

			const result = await node.methods.listSearch.searchModels.call(mockContext);

			expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
			expect(httpRequestWithAuthentication.mock.calls[0][1].qs.parent).toBeUndefined();
			expect(httpRequestWithAuthentication.mock.calls[1][1].qs.parent).toBe('schemas/system.ai');
			expect(result.results).toEqual([
				expect.objectContaining({ value: 'system.ai.gpt-oss-120b' }),
			]);
		});

		it('should rethrow list errors other than 400', async () => {
			setupSearchContext('https://my.databricks.com', modelServicesResponse);
			httpRequestWithAuthentication
				.mockReset()
				.mockRejectedValueOnce(new NodeApiError(mockNodeDef, {}, { httpCode: '403' }));

			await expect(node.methods.listSearch.searchModels.call(mockContext)).rejects.toThrow(
				NodeApiError,
			);
			expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		});

		it('should strip the trailing slash from the host in the request URL', async () => {
			setupSearchContext('https://my.databricks.com/', modelServicesResponse);

			await node.methods.listSearch.searchModels.call(mockContext);

			const [, requestOptions] = httpRequestWithAuthentication.mock.calls[0];
			expect(requestOptions.url).toBe(
				'https://my.databricks.com/api/2.1/unity-catalog/model-services',
			);
		});

		it('should send the partner User-Agent on the model service listing request', async () => {
			setupSearchContext('https://my.databricks.com', modelServicesResponse);

			await node.methods.listSearch.searchModels.call(mockContext);

			const [, requestOptions] = httpRequestWithAuthentication.mock.calls[0];
			expect(requestOptions.headers).toMatchObject({ 'User-Agent': DATABRICKS_PARTNER_USER_AGENT });
		});
	});
});
