/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatAnthropic } from '@langchain/anthropic';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatAnthropic } from '../LMChatAnthropic/LmChatAnthropic.node';
import { N8nLlmTracing } from '../N8nLlmTracing';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';

jest.mock('@langchain/anthropic');
jest.mock('../N8nLlmTracing');
jest.mock('../n8nLlmFailedAttemptHandler');
jest.mock('@utils/httpProxyAgent', () => ({
	getProxyAgent: jest.fn().mockReturnValue({}),
}));

const MockedChatAnthropic = jest.mocked(ChatAnthropic);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);

describe('LmChatAnthropic', () => {
	let lmChatAnthropic: LmChatAnthropic;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Anthropic Chat Model',
		typeVersion: 1.3,
		type: 'n8n-nodes-langchain.lmChatAnthropic',
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
		MockedN8nLlmTracing.mockImplementation(() => ({}) as any);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());

		return mockContext;
	};

	beforeEach(() => {
		lmChatAnthropic = new LmChatAnthropic();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(lmChatAnthropic.description).toMatchObject({
				displayName: 'Anthropic Chat Model',
				name: 'lmChatAnthropic',
				group: ['transform'],
				version: [1, 1.1, 1.2, 1.3],
				description: 'Language Model Anthropic',
			});
		});

		it('should have correct credentials configuration', () => {
			expect(lmChatAnthropic.description.credentials).toEqual([
				{
					name: 'anthropicApi',
					required: true,
				},
			]);
		});

		it('should have correct output configuration', () => {
			expect(lmChatAnthropic.description.outputs).toEqual(['ai_languageModel']);
			expect(lmChatAnthropic.description.outputNames).toEqual(['Model']);
		});
	});

	describe('supplyData', () => {
		it('should create ChatAnthropic instance with basic configuration (version >= 1.3)', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			const result = await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(mockContext.getCredentials).toHaveBeenCalledWith('anthropicApi');
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('model.value', 0);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
			expect(MockedChatAnthropic).toHaveBeenCalledWith(
				expect.objectContaining({
					anthropicApiKey: 'test-api-key',
					model: 'claude-sonnet-4-20250514',
					anthropicApiUrl: 'https://api.anthropic.com',
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
					invocationKwargs: {},
					clientOptions: {
						fetchOptions: {
							dispatcher: {},
						},
					},
				}),
			);

			expect(result).toEqual({
				response: expect.any(Object),
			});
		});

		it('should create ChatAnthropic instance with basic configuration (version < 1.3)', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.2 });

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'claude-3-5-sonnet-20240620';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('model', 0);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
			expect(MockedChatAnthropic).toHaveBeenCalledWith(
				expect.objectContaining({
					anthropicApiKey: 'test-api-key',
					model: 'claude-3-5-sonnet-20240620',
					anthropicApiUrl: 'https://api.anthropic.com',
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
					invocationKwargs: {},
					clientOptions: {
						fetchOptions: {
							dispatcher: {},
						},
					},
				}),
			);
		});

		it('should handle custom baseURL from credentials', async () => {
			const customURL = 'https://custom-anthropic.example.com';
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				url: customURL,
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(MockedChatAnthropic).toHaveBeenCalledWith(
				expect.objectContaining({
					anthropicApiKey: 'test-api-key',
					model: 'claude-sonnet-4-20250514',
					anthropicApiUrl: customURL,
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
					invocationKwargs: {},
					clientOptions: {
						fetchOptions: {
							dispatcher: {},
						},
					},
				}),
			);
		});

		it('should handle custom headers from credentials', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				header: true,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value',
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(MockedChatAnthropic).toHaveBeenCalledWith(
				expect.objectContaining({
					anthropicApiKey: 'test-api-key',
					model: 'claude-sonnet-4-20250514',
					anthropicApiUrl: 'https://api.anthropic.com',
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
					invocationKwargs: {},
					clientOptions: {
						fetchOptions: {
							dispatcher: {},
						},
						defaultHeaders: {
							'X-Custom-Header': 'custom-value',
						},
					},
				}),
			);
		});

		it('should handle all available options', async () => {
			const mockContext = setupMockContext();
			const options = {
				maxTokensToSample: 1000,
				temperature: 0.8,
				topK: 5,
				topP: 0.9,
			};

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(MockedChatAnthropic).toHaveBeenCalledWith(
				expect.objectContaining({
					anthropicApiKey: 'test-api-key',
					model: 'claude-sonnet-4-20250514',
					maxTokens: 1000,
					temperature: 0.8,
					topK: 5,
					topP: 0.9,
					anthropicApiUrl: 'https://api.anthropic.com',
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
					invocationKwargs: {},
					clientOptions: {
						fetchOptions: {
							dispatcher: {},
						},
					},
				}),
			);
		});

		it('should handle thinking mode', async () => {
			const mockContext = setupMockContext();
			const options = {
				thinking: true,
				thinkingBudget: 2048,
				maxTokensToSample: 4096,
			};

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(MockedChatAnthropic).toHaveBeenCalledWith(
				expect.objectContaining({
					anthropicApiKey: 'test-api-key',
					model: 'claude-sonnet-4-20250514',
					maxTokens: 4096,
					anthropicApiUrl: 'https://api.anthropic.com',
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
					invocationKwargs: {
						thinking: {
							type: 'enabled',
							budget_tokens: 2048,
						},
						max_tokens: 4096,
						top_k: undefined,
						top_p: undefined,
						temperature: undefined,
					},
					clientOptions: {
						fetchOptions: {
							dispatcher: {},
						},
					},
				}),
			);
		});

		it('should create N8nLlmTracing callback', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(MockedN8nLlmTracing).toHaveBeenCalledWith(mockContext, {
				tokensUsageParser: expect.any(Function),
			});
		});

		it('should create failed attempt handler', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(mockedMakeN8nLlmFailedAttemptHandler).toHaveBeenCalledWith(mockContext);
		});

		it('should not add custom headers when header toggle is disabled', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				header: false,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value',
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(MockedChatAnthropic).toHaveBeenCalledWith(
				expect.objectContaining({
					clientOptions: {
						fetchOptions: {
							dispatcher: {},
						},
					},
				}),
			);

			// Verify that defaultHeaders is not set
			const callArgs = MockedChatAnthropic.mock.calls[0]?.[0];
			expect(callArgs?.clientOptions?.defaultHeaders).toBeUndefined();
		});

		it('should handle custom headers and custom URL together', async () => {
			const customURL = 'https://custom-anthropic.example.com';
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				url: customURL,
				header: true,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value',
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(MockedChatAnthropic).toHaveBeenCalledWith(
				expect.objectContaining({
					anthropicApiKey: 'test-api-key',
					model: 'claude-sonnet-4-20250514',
					anthropicApiUrl: customURL,
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
					invocationKwargs: {},
					clientOptions: {
						fetchOptions: {
							dispatcher: {},
						},
						defaultHeaders: {
							'X-Custom-Header': 'custom-value',
						},
					},
				}),
			);
		});
	});

	describe('methods', () => {
		beforeEach(() => {
			setupMockContext();
		});

		it('should have searchModels method', () => {
			expect(lmChatAnthropic.methods).toEqual({
				listSearch: {
					searchModels: expect.any(Function),
				},
			});
		});
	});
});
