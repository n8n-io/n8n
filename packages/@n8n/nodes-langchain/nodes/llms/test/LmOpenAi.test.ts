/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { OpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { ILoadOptionsFunctions, INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmOpenAi } from '../LMOpenAi/LmOpenAi.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const MockedN8nLlmTracing = vi.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);

describe('LmOpenAi', () => {
	let lmOpenAi: LmOpenAi;
	let mockContext: Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'OpenAI Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmOpenAi',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (credentials: Record<string, unknown> = { apiKey: 'test-api-key' }) => {
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;

		mockContext.getCredentials = vi.fn().mockResolvedValue(credentials);
		mockContext.getNode = vi.fn().mockReturnValue(mockNode);
		mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'gpt-3.5-turbo-instruct';
			if (paramName === 'options') return {};
			return undefined;
		});

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as never);
		return mockContext;
	};

	beforeEach(() => {
		lmOpenAi = new LmOpenAi();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('supplyData', () => {
		it('should construct the model with an N8nLlmTracing callback', async () => {
			const mockContext = setupMockContext();

			await lmOpenAi.supplyData.call(mockContext, 0);

			expect(OpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'gpt-3.5-turbo-instruct',
					callbacks: expect.arrayContaining([expect.any(Object)]),
				}),
			);
		});

		it('should pass empty redactedHeaders to N8nLlmTracing when no custom header is configured', async () => {
			const mockContext = setupMockContext();

			await lmOpenAi.supplyData.call(mockContext, 0);

			expect(MockedN8nLlmTracing).toHaveBeenCalledWith(mockContext, { redactedHeaders: [] });
		});

		it('should pass the declared header name to N8nLlmTracing', async () => {
			const mockContext = setupMockContext({
				apiKey: 'test-api-key',
				header: true,
				headerName: 'x-custom-header',
				headerValue: 'secret-value',
			});

			await lmOpenAi.supplyData.call(mockContext, 0);

			expect(MockedN8nLlmTracing).toHaveBeenCalledWith(mockContext, {
				redactedHeaders: ['x-custom-header'],
			});
		});

		it('should reject a baseURL override that the credential domain restriction disallows', async () => {
			const mockContext = setupMockContext({
				apiKey: 'test-api-key',
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'api.openai.com',
			});
			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'gpt-3.5-turbo-instruct';
				if (paramName === 'options') return { baseURL: 'http://127.0.0.1:9099/v1' };
				return undefined;
			});

			await expect(lmOpenAi.supplyData.call(mockContext, 0)).rejects.toThrow('Domain not allowed');
			expect(OpenAI).not.toHaveBeenCalled();
		});

		it('should allow a baseURL override that the credential domain restriction permits', async () => {
			const mockContext = setupMockContext({
				apiKey: 'test-api-key',
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'api.openai.com',
			});
			mockContext.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'gpt-3.5-turbo-instruct';
				if (paramName === 'options') return { baseURL: 'https://api.openai.com/v1' };
				return undefined;
			});

			await lmOpenAi.supplyData.call(mockContext, 0);
			expect(OpenAI).toHaveBeenCalled();
		});
	});

	describe('openAiModelSearch', () => {
		const setupMockLoadContext = (
			credentials: Record<string, unknown>,
			options: Record<string, unknown>,
		) => {
			const requestWithAuthentication = vi.fn().mockResolvedValue({ data: [] });

			return {
				getCredentials: vi.fn().mockResolvedValue(credentials),
				getNode: vi.fn().mockReturnValue(mockNode),
				getNodeParameter: vi.fn().mockImplementation((paramName: string) => {
					if (paramName === 'options') return options;
					return undefined;
				}),
				helpers: {
					requestWithAuthentication,
				},
			} as unknown as Mocked<ILoadOptionsFunctions> & {
				helpers: { requestWithAuthentication: typeof requestWithAuthentication };
			};
		};

		it('should not send credentials to a domain the credential restricts', async () => {
			const mockLoadContext = setupMockLoadContext(
				{
					apiKey: 'test-api-key',
					allowedHttpRequestDomains: 'domains',
					allowedDomains: 'api.openai.com',
				},
				{ baseURL: 'http://127.0.0.1:9099/v1' },
			);

			await expect(
				lmOpenAi.methods.listSearch.openAiModelSearch.call(mockLoadContext),
			).rejects.toThrow('Domain not allowed');
			expect(mockLoadContext.helpers.requestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should forward the allowed domains to the request when the base URL is on the allowlist', async () => {
			const mockLoadContext = setupMockLoadContext(
				{
					apiKey: 'test-api-key',
					allowedHttpRequestDomains: 'domains',
					allowedDomains: 'api.openai.com',
				},
				{ baseURL: 'https://api.openai.com/v1' },
			);
			mockLoadContext.helpers.requestWithAuthentication.mockResolvedValue({
				data: [{ id: 'gpt-4', owned_by: 'system' }],
			});

			await expect(
				lmOpenAi.methods.listSearch.openAiModelSearch.call(mockLoadContext),
			).resolves.toBeDefined();

			expect(mockLoadContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'openAiApi',
				expect.objectContaining({
					uri: 'https://api.openai.com/v1/models',
					allowedDomains: 'api.openai.com',
				}),
			);
		});
	});
});
