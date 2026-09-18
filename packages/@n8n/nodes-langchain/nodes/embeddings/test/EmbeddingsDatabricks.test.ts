/* eslint-disable @typescript-eslint/unbound-method */
import { OpenAIEmbeddings } from '@langchain/openai';
import { createRefreshingAuthFetch, getProxyAgent, logWrapper } from '@n8n/ai-utilities';
import { DATABRICKS_PARTNER_USER_AGENT } from 'n8n-nodes-base/dist/nodes/Databricks/constants';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { ILoadOptionsFunctions, INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { EmbeddingsDatabricks } from '../EmbeddingsDatabricks/EmbeddingsDatabricks.node';
import { getDatabricksTokenProvider } from '@utils/databricks/token-provider';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');
vi.mock('@utils/databricks/token-provider');

const MockedOpenAIEmbeddings = vi.mocked(OpenAIEmbeddings);
const mockedLogWrapper = vi.mocked(logWrapper);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);
const mockedGetDatabricksTokenProvider = vi.mocked(getDatabricksTokenProvider);
const mockedCreateRefreshingAuthFetch = vi.mocked(createRefreshingAuthFetch);

const mockTokenProvider = {
	getToken: vi.fn(async () => 'test-token'),
	refreshAfterRejection: vi.fn(async () => null as string | null),
	expiredStatus: 403,
};

const mockCredential = {
	host: 'https://my.databricks.com/',
	grantType: 'clientCredentials',
	clientId: 'test-client-id',
	clientSecret: 'test-client-secret',
	scope: 'all-apis',
	authentication: 'header',
	allowedHttpRequestDomains: 'all',
	allowedDomains: '',
};

describe('EmbeddingsDatabricks', () => {
	let node: EmbeddingsDatabricks;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Embeddings Databricks',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.embeddingsDatabricks',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (
		credentialOverrides: Partial<typeof mockCredential> = {},
		options: Record<string, unknown> = {},
	) => {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNodeDef,
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({ ...mockCredential, ...credentialOverrides });
		ctx.getNode = vi.fn().mockReturnValue(mockNodeDef);
		ctx.helpers.getSecureEgressFilter = vi.fn().mockReturnValue(undefined);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'system.ai.gte-large-en';
			if (paramName === 'options') return options;
			return undefined;
		});

		mockTokenProvider.refreshAfterRejection.mockResolvedValue(null);
		mockedGetProxyAgent.mockReturnValue({} as never);
		mockedGetDatabricksTokenProvider.mockReturnValue(mockTokenProvider);
		mockedCreateRefreshingAuthFetch.mockReturnValue(vi.fn() as unknown as typeof fetch);
		mockedLogWrapper.mockImplementation((value) => value);
		return ctx;
	};

	beforeEach(() => {
		node = new EmbeddingsDatabricks();
		vi.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'Embeddings Databricks',
				name: 'embeddingsDatabricks',
				group: ['transform'],
				version: 1,
				hidden: true,
				credentials: [{ name: 'databricksOAuth2Api', required: true }],
				inputs: [],
				outputs: ['ai_embedding'],
				outputNames: ['Embeddings'],
			});
		});
	});

	describe('supplyData', () => {
		it('should create OpenAIEmbeddings against the AI gateway', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('databricksOAuth2Api');
			expect(MockedOpenAIEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'databricks-oauth',
					model: 'system.ai.gte-large-en',
					timeout: 360000,
					maxRetries: 2,
					onFailedAttempt: expect.any(Function),
				}),
			);
			const callArgs = MockedOpenAIEmbeddings.mock.calls[0][0];
			expect(callArgs?.configuration?.baseURL).toBe(
				'https://my.databricks.com/ai-gateway/openai/v1',
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});

		it('should wrap the client so embed calls are logged', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(mockedLogWrapper).toHaveBeenCalledWith(MockedOpenAIEmbeddings.mock.instances[0], ctx);
		});

		it('should read the model via resourceLocator value extraction', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(ctx.getNodeParameter).toHaveBeenCalledWith('model', 0, '', { extractValue: true });
		});

		it('should pass options through', async () => {
			const ctx = setupMockContext(
				{},
				{ batchSize: 64, stripNewLines: false, timeout: 60000, maxRetries: 5 },
			);

			await node.supplyData.call(ctx, 0);

			expect(MockedOpenAIEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					batchSize: 64,
					stripNewLines: false,
					timeout: 60000,
					maxRetries: 5,
				}),
			);
		});

		it('should send the bearer and the partner User-Agent on every request', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			const [fetchOptions] = mockedCreateRefreshingAuthFetch.mock.calls[0];
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

		it('should name the configured model service in the rate limit error', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			const { onFailedAttempt } = MockedOpenAIEmbeddings.mock.calls[0][0] ?? {};
			expect(() =>
				onFailedAttempt?.(Object.assign(new Error('429 x'), { status: 429, attemptNumber: 1 })),
			).toThrow('Databricks rate limit reached for system.ai.gte-large-en');
		});

		it('should reject non-https hosts', async () => {
			const ctx = setupMockContext({ host: 'http://my.databricks.com' });

			await expect(node.supplyData.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(MockedOpenAIEmbeddings).not.toHaveBeenCalled();
		});
	});

	describe('searchModels', () => {
		const modelServicesResponse = {
			model_services: [
				{
					name: 'model-services/system.ai.gte-large-en',
					comment: 'GTE large',
					supported_api_types: ['mlflow/v1/embeddings'],
				},
				{
					name: 'model-services/main.ml.custom-embeddings',
					supported_api_types: ['openai/v1/embeddings'],
				},
				{
					name: 'model-services/system.ai.gpt-oss-120b',
					supported_api_types: ['mlflow/v1/chat/completions'],
				},
				{ name: 'model-services/main.ml.untyped' },
			],
		};
		const [, , chatService] = modelServicesResponse.model_services;

		let mockContext: Mocked<ILoadOptionsFunctions>;
		let httpRequestWithAuthentication: ReturnType<typeof vi.fn>;

		const setupSearchContext = (response: unknown) => {
			httpRequestWithAuthentication = vi.fn().mockResolvedValue(response);
			mockContext = {
				getCredentials: vi.fn().mockResolvedValue(mockCredential),
				getNode: vi.fn().mockReturnValue(mockNodeDef),
				helpers: { httpRequestWithAuthentication },
			} as unknown as Mocked<ILoadOptionsFunctions>;
		};

		it('should list only embeddings-capable model services', async () => {
			setupSearchContext(modelServicesResponse);

			const result = await node.methods.listSearch.searchModels.call(mockContext);

			expect(result.results).toStrictEqual([
				{
					name: 'system.ai.gte-large-en',
					value: 'system.ai.gte-large-en',
					description: 'GTE large',
				},
				{
					name: 'main.ml.custom-embeddings',
					value: 'main.ml.custom-embeddings',
					description: undefined,
				},
			]);
		});

		it('should throw when the workspace has no model services', async () => {
			setupSearchContext({ model_services: [] });

			await expect(node.methods.listSearch.searchModels.call(mockContext)).rejects.toThrow(
				'No model services found',
			);
		});

		it('should throw when no model service can embed', async () => {
			setupSearchContext({ model_services: [chatService] });

			await expect(node.methods.listSearch.searchModels.call(mockContext)).rejects.toThrow(
				'No embeddings-capable model services found',
			);
		});
	});
});
