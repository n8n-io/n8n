/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatOpenAi } from '../LMChatOpenAi/LmChatOpenAi.node';
import { N8nLlmTracing } from '../N8nLlmTracing';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';

jest.mock('@langchain/openai');
jest.mock('../N8nLlmTracing');
jest.mock('../n8nLlmFailedAttemptHandler');
jest.mock('@utils/httpProxyAgent', () => ({
	getProxyAgent: jest.fn().mockReturnValue({}),
}));

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);

describe('LmChatOpenAi', () => {
	let lmChatOpenAi: LmChatOpenAi;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'OpenAI Chat Model',
		typeVersion: 1.2,
		type: 'n8n-nodes-langchain.lmChatOpenAi',
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
		lmChatOpenAi = new LmChatOpenAi();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(lmChatOpenAi.description).toMatchObject({
				displayName: 'OpenAI Chat Model',
				name: 'lmChatOpenAi',
				group: ['transform'],
				version: [1, 1.1, 1.2],
				description: 'For advanced usage with an AI chain',
			});
		});

		it('should have correct credentials configuration', () => {
			expect(lmChatOpenAi.description.credentials).toEqual([
				{
					name: 'openAiApi',
					required: true,
				},
			]);
		});

		it('should have correct output configuration', () => {
			expect(lmChatOpenAi.description.outputs).toEqual(['ai_languageModel']);
			expect(lmChatOpenAi.description.outputNames).toEqual(['Model']);
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI instance with basic configuration (version >= 1.2)', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.2 });

			// Mock getNodeParameter to handle the proper parameter names for v1.2
			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			const result = await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(mockContext.getCredentials).toHaveBeenCalledWith('openAiApi');
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('model.value', 0);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					timeout: 60000,
					maxRetries: 2,
					configuration: {},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {},
					onFailedAttempt: expect.any(Function),
				}),
			);

			expect(result).toEqual({
				response: expect.any(Object),
			});
		});

		it('should create ChatOpenAI instance with basic configuration (version < 1.2)', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.1 });

			// Mock getNodeParameter to handle the proper parameter names for v1.1
			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('model', 0);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					timeout: 60000,
					maxRetries: 2,
					configuration: {},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {},
					onFailedAttempt: expect.any(Function),
				}),
			);
		});

		it('should handle custom baseURL from options', async () => {
			const customBaseURL = 'https://custom-api.example.com/v1';
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options')
					return {
						baseURL: customBaseURL,
						timeout: 30000,
						maxRetries: 5,
					};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					baseURL: customBaseURL,
					timeout: 30000,
					maxRetries: 5,
					configuration: {
						baseURL: customBaseURL,
						fetchOptions: {
							dispatcher: {},
						},
					},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {},
					onFailedAttempt: expect.any(Function),
				}),
			);
		});

		it('should handle custom baseURL from credentials', async () => {
			const customURL = 'https://custom-openai.example.com/v1';
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				url: customURL,
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					timeout: 60000,
					maxRetries: 2,
					configuration: {
						baseURL: customURL,
						fetchOptions: {
							dispatcher: {},
						},
					},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {},
					onFailedAttempt: expect.any(Function),
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
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					timeout: 60000,
					maxRetries: 2,
					configuration: {
						defaultHeaders: {
							'X-Custom-Header': 'custom-value',
						},
					},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {},
					onFailedAttempt: expect.any(Function),
				}),
			);
		});

		it('should handle all available options', async () => {
			const mockContext = setupMockContext();
			const options = {
				frequencyPenalty: 0.5,
				maxTokens: 1000,
				presencePenalty: 0.3,
				temperature: 0.8,
				topP: 0.9,
				timeout: 45000,
				maxRetries: 3,
				responseFormat: 'json_object' as const,
				reasoningEffort: 'high' as const,
			};

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					frequencyPenalty: 0.5,
					maxTokens: 1000,
					presencePenalty: 0.3,
					temperature: 0.8,
					topP: 0.9,
					timeout: 45000,
					maxRetries: 3,
					responseFormat: 'json_object',
					reasoningEffort: 'high',
					configuration: {},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {
						response_format: { type: 'json_object' },
						reasoning_effort: 'high',
					},
					onFailedAttempt: expect.any(Function),
				}),
			);
		});

		it('should only add valid reasoning effort to modelKwargs', async () => {
			const mockContext = setupMockContext();
			const options = {
				reasoningEffort: 'invalid' as 'low' | 'medium' | 'high',
			};

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'gpt-4o-mini',
					reasoningEffort: 'invalid',
					timeout: 60000,
					maxRetries: 2,
					configuration: {},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {}, // Should not include invalid reasoning_effort
					onFailedAttempt: expect.any(Function),
				}),
			);
		});

		it('should create N8nLlmTracing callback', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedN8nLlmTracing).toHaveBeenCalledWith(mockContext);
		});

		it('should create failed attempt handler', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(mockedMakeN8nLlmFailedAttemptHandler).toHaveBeenCalledWith(
				mockContext,
				expect.any(Function), // openAiFailedAttemptHandler
			);
		});

		it('should use default values for timeout and maxRetries when not provided', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					timeout: 60000,
					maxRetries: 2,
				}),
			);
		});

		it('should prioritize options.baseURL over credentials.url', async () => {
			const optionsBaseURL = 'https://options-api.example.com/v1';
			const credentialsURL = 'https://credentials-api.example.com/v1';
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				url: credentialsURL,
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options')
					return {
						baseURL: optionsBaseURL,
					};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: {
						baseURL: optionsBaseURL,
						fetchOptions: {
							dispatcher: {},
						},
					},
				}),
			);
		});

		it('should handle text response format correctly', async () => {
			const mockContext = setupMockContext();
			const options = {
				responseFormat: 'text' as const,
			};

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'gpt-4o-mini';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					responseFormat: 'text',
					modelKwargs: {
						response_format: { type: 'text' },
					},
				}),
			);
		});

		it('should handle all reasoning effort values correctly', async () => {
			const reasoningEffortValues = ['low', 'medium', 'high'] as const;

			for (const effort of reasoningEffortValues) {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model.value') return 'gpt-4o-mini';
					if (paramName === 'options')
						return {
							reasoningEffort: effort,
						};
					return undefined;
				});

				await lmChatOpenAi.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						reasoningEffort: effort,
						modelKwargs: {
							reasoning_effort: effort,
						},
					}),
				);

				jest.clearAllMocks();
			}
		});
	});

	describe('methods', () => {
		beforeEach(() => {
			setupMockContext();
		});

		it('should have searchModels method', () => {
			expect(lmChatOpenAi.methods).toEqual({
				listSearch: {
					searchModels: expect.any(Function),
				},
			});
		});
	});
});
