/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ChatOpenAI } from '@langchain/openai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../N8nLlmTracing';
import { DEFAULT_OPENROUTER_API_URL } from './constants';
import { LmChatOpenRouter } from './LmChatOpenRouter.node';

jest.mock('@langchain/openai');
jest.mock('../N8nLlmTracing');
jest.mock('../n8nLlmFailedAttemptHandler');
jest.mock('@utils/httpProxyAgent', () => ({
	getProxyAgent: jest.fn().mockReturnValue({}),
}));

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);

describe('LmChatOpenRouter', () => {
	let lmChatOpenRouter: LmChatOpenRouter;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'OpenRouter Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatOpenRouter',
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

		// Mock the constructors/functions properly
		MockedN8nLlmTracing.mockImplementation(() => ({}) as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());

		return mockContext;
	};

	beforeEach(() => {
		lmChatOpenRouter = new LmChatOpenRouter();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(lmChatOpenRouter.description).toMatchObject({
				displayName: 'OpenRouter Chat Model',
				name: 'lmChatOpenRouter',
				group: ['transform'],
				version: [1],
				description: 'For advanced usage with an AI chain',
			});
		});

		it('should have correct credentials configuration', () => {
			expect(lmChatOpenRouter.description.credentials).toEqual([
				{
					name: 'openRouterApi',
					required: true,
				},
			]);
		});

		it('should have correct output configuration', () => {
			expect(lmChatOpenRouter.description.outputs).toEqual(['ai_languageModel']);
			expect(lmChatOpenRouter.description.outputNames).toEqual(['Model']);
		});

		it('should have requestDefaults with fallback URL', () => {
			expect(lmChatOpenRouter.description.requestDefaults).toEqual({
				ignoreHttpStatusErrors: true,
				baseURL: `={{ $credentials?.url || "${DEFAULT_OPENROUTER_API_URL}" }}`,
			});
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI instance with basic configuration', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4.1-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			const result = await lmChatOpenRouter.supplyData.call(mockContext, 0);

			expect(mockContext.getCredentials).toHaveBeenCalledWith('openRouterApi');
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('model', 0);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'openai/gpt-4.1-mini',
					timeout: 60000,
					maxRetries: 2,
					configuration: {
						baseURL: DEFAULT_OPENROUTER_API_URL,
						fetchOptions: {
							dispatcher: {},
						},
					},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
				}),
			);

			expect(result).toEqual({
				response: expect.any(Object),
			});
		});

		it('should use default URL when credentials.url is not provided', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials = jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				url: '', // Empty URL
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4.1-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenRouter.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: {
						baseURL: DEFAULT_OPENROUTER_API_URL,
						fetchOptions: {
							dispatcher: {},
						},
					},
				}),
			);
		});

		it('should use custom URL when credentials.url is provided', async () => {
			const customURL = 'https://custom-openrouter.example.com/api/v1';
			const mockContext = setupMockContext();

			mockContext.getCredentials = jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				url: customURL,
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4.1-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenRouter.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: {
						baseURL: customURL,
						fetchOptions: {
							dispatcher: {},
						},
					},
				}),
			);
		});

		it('should handle all available options', async () => {
			const mockContext = setupMockContext();
			const options = {
				maxTokens: 2048,
				temperature: 0.8,
				topP: 0.9,
				frequencyPenalty: 0.5,
				presencePenalty: 0.3,
				timeout: 60000,
				maxRetries: 5,
				responseFormat: 'json_object' as const,
			};

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4.1-mini';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatOpenRouter.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'openai/gpt-4.1-mini',
					maxTokens: 2048,
					temperature: 0.8,
					topP: 0.9,
					frequencyPenalty: 0.5,
					presencePenalty: 0.3,
					timeout: 60000,
					maxRetries: 5,
					modelKwargs: {
						response_format: { type: 'json_object' },
					},
				}),
			);
		});

		it('should use default timeout and maxRetries when not specified', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4.1-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenRouter.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					timeout: 60000,
					maxRetries: 2,
				}),
			);
		});

		it('should not include modelKwargs when responseFormat is not set', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4.1-mini';
				if (paramName === 'options') return { temperature: 0.7 };
				return undefined;
			});

			await lmChatOpenRouter.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: undefined,
				}),
			);
		});

		it('should create N8nLlmTracing callback', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4.1-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenRouter.supplyData.call(mockContext, 0);

			expect(MockedN8nLlmTracing).toHaveBeenCalledWith(mockContext);
		});

		it('should create failed attempt handler', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4.1-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenRouter.supplyData.call(mockContext, 0);

			expect(mockedMakeN8nLlmFailedAttemptHandler).toHaveBeenCalledWith(
				mockContext,
				expect.any(Function),
			);
		});
	});
});
