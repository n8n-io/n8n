/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatTruefoundry } from '../LmChatTruefoundry.node';
import { makeN8nLlmFailedAttemptHandler } from '../../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../../N8nLlmTracing';

jest.mock('@langchain/openai');
jest.mock('../../N8nLlmTracing');
jest.mock('../../n8nLlmFailedAttemptHandler');
jest.mock('@utils/httpProxyAgent', () => ({
	getProxyAgent: jest.fn().mockReturnValue({}),
}));

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);

describe('LmChatTruefoundry', () => {
	let lmChatTruefoundry: LmChatTruefoundry;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Truefoundry Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatTruefoundry',
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
			url: 'https://test-truefoundry.com/v1',
		});
		mockContext.getNode = jest.fn().mockReturnValue(node);
		mockContext.getNodeParameter = jest.fn();
		mockContext.evaluateExpression = jest.fn().mockReturnValue('');

		// Mock the constructors/functions properly
		MockedN8nLlmTracing.mockImplementation(() => ({}) as any);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());

		return mockContext;
	};

	beforeEach(() => {
		lmChatTruefoundry = new LmChatTruefoundry();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(lmChatTruefoundry.description).toMatchObject({
				displayName: 'Truefoundry Chat Model',
				name: 'lmChatTruefoundry',
				group: ['transform'],
				version: [1],
				description: 'For advanced usage with an AI chain',
			});
		});

		it('should have correct credentials configuration', () => {
			expect(lmChatTruefoundry.description.credentials).toEqual([
				{
					name: 'truefoundryAiGatewayApi',
					required: true,
				},
			]);
		});

		it('should have correct output configuration', () => {
			expect(lmChatTruefoundry.description.outputs).toEqual(['ai_languageModel']);
			expect(lmChatTruefoundry.description.outputNames).toEqual(['Model']);
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI instance with basic configuration', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return {};
				return undefined;
			});

			const result = await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(mockContext.getCredentials).toHaveBeenCalledWith('truefoundryAiGatewayApi');
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('model.value', 0);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'openai/gpt-4',
					timeout: 60000,
					maxRetries: 2,
					configuration: {
						baseURL: 'https://test-truefoundry.com/v1',
						fetchOptions: {
							dispatcher: {},
						},
					},
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {},
					onFailedAttempt: expect.any(Function),
				}),
			);

			expect(result).toEqual({
				response: expect.any(Object),
			});
		});

		it('should handle custom baseURL from credentials', async () => {
			const customURL = 'https://custom-truefoundry.example.com/v1';
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				url: customURL,
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'openai/gpt-4',
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
				url: 'https://test-truefoundry.com/v1',
				header: true,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value',
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'openai/gpt-4',
					timeout: 60000,
					maxRetries: 2,
					configuration: {
						baseURL: 'https://test-truefoundry.com/v1',
						fetchOptions: {
							dispatcher: {},
						},
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

		it('should add X-TFY-METADATA header with user email', async () => {
			const mockContext = setupMockContext();
			const userEmail = '{"x-n8n-user": "user@example.com"}';

			mockContext.evaluateExpression = jest.fn().mockReturnValue(userEmail);

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(mockContext.evaluateExpression).toHaveBeenCalledWith(
				'{{ JSON.stringify({"x-n8n-user": $json.metadata.user.email}) }}',
				0,
			);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.objectContaining({
						defaultHeaders: {
							'X-TFY-METADATA': userEmail,
						},
					}),
				}),
			);
		});

		it('should combine X-TFY-METADATA and custom headers', async () => {
			const mockContext = setupMockContext();
			const userEmail = '{"x-n8n-user": "user@example.com"}';

			mockContext.evaluateExpression = jest.fn().mockReturnValue(userEmail);

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				url: 'https://test-truefoundry.com/v1',
				header: true,
				headerName: 'X-Custom-Header',
				headerValue: 'custom-value',
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.objectContaining({
						defaultHeaders: {
							'X-TFY-METADATA': userEmail,
							'X-Custom-Header': 'custom-value',
						},
					}),
				}),
			);
		});

		it('should not add X-TFY-METADATA header if evaluateExpression returns empty or invalid value', async () => {
			const mockContext = setupMockContext();

			mockContext.evaluateExpression = jest.fn().mockReturnValue('');

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.not.objectContaining({
						defaultHeaders: expect.objectContaining({
							'X-TFY-METADATA': expect.anything(),
						}),
					}),
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
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-api-key',
					model: 'openai/gpt-4',
					frequencyPenalty: 0.5,
					maxTokens: 1000,
					presencePenalty: 0.3,
					temperature: 0.8,
					topP: 0.9,
					timeout: 45000,
					maxRetries: 3,
					configuration: expect.objectContaining({
						baseURL: 'https://test-truefoundry.com/v1',
					}),
					callbacks: expect.arrayContaining([expect.any(Object)]),
					modelKwargs: {
						response_format: { type: 'json_object' },
						reasoning_effort: 'high',
					},
					onFailedAttempt: expect.any(Function),
				}),
			);
		});

		it('should handle text response format correctly', async () => {
			const mockContext = setupMockContext();
			const options = {
				responseFormat: 'text' as const,
			};

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
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
					if (paramName === 'model.value') return 'openai/gpt-4';
					if (paramName === 'options')
						return {
							reasoningEffort: effort,
						};
					return undefined;
				});

				await lmChatTruefoundry.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: {
							reasoning_effort: effort,
						},
					}),
				);

				jest.clearAllMocks();
			}
		});

		it('should only add valid reasoning effort to modelKwargs', async () => {
			const mockContext = setupMockContext();
			const options = {
				reasoningEffort: 'invalid' as 'low' | 'medium' | 'high',
			};

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'openai/gpt-4',
					modelKwargs: {}, // Should not include invalid reasoning_effort
				}),
			);
		});

		it('should create N8nLlmTracing callback', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(MockedN8nLlmTracing).toHaveBeenCalledWith(mockContext);
		});

		it('should create failed attempt handler', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(mockedMakeN8nLlmFailedAttemptHandler).toHaveBeenCalledWith(
				mockContext,
				expect.any(Function), // openAiFailedAttemptHandler
			);
		});

		it('should use default values for timeout and maxRetries when not provided', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					timeout: 60000,
					maxRetries: 2,
				}),
			);
		});

		it('should not add modelKwargs when no responseFormat or reasoningEffort provided', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'openai/gpt-4';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatTruefoundry.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: {},
				}),
			);
		});
	});

	describe('methods', () => {
		beforeEach(() => {
			setupMockContext();
		});

		it('should have searchModels method', () => {
			expect(lmChatTruefoundry.methods).toEqual({
				listSearch: {
					searchModels: expect.any(Function),
				},
			});
		});
	});
});
