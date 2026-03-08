/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ChatAnthropic } from '@langchain/anthropic';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { LmChatAnthropic } from '../LmChatAnthropic.node';

jest.mock('@langchain/anthropic');
jest.mock('@n8n/ai-utilities');

const MockedChatAnthropic = jest.mocked(ChatAnthropic);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = jest.mocked(getProxyAgent);

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
		MockedN8nLlmTracing.mockImplementation(() => ({}) as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		return mockContext;
	};

	const createMockModel = (properties: Partial<ChatAnthropic>): ChatAnthropic => {
		const mockModel = properties as ChatAnthropic;
		MockedChatAnthropic.mockImplementation(() => mockModel);
		return mockModel;
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
					maxTokens: undefined,
					temperature: undefined,
					topK: undefined,
					topP: undefined,
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
				if (paramName === 'model') return 'claude-3-5-sonnet-20241022';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('model', 0);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
			expect(MockedChatAnthropic).toHaveBeenCalledWith(
				expect.objectContaining({
					anthropicApiKey: 'test-api-key',
					model: 'claude-3-5-sonnet-20241022',
					anthropicApiUrl: 'https://api.anthropic.com',
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
				}),
			);
		});

		it('should handle all available options', async () => {
			const mockContext = setupMockContext();
			const options = {
				maxTokensToSample: 2048,
				temperature: 0.8,
				topK: 40,
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
					anthropicApiUrl: 'https://api.anthropic.com',
					maxTokens: 2048,
					temperature: 0.8,
					topK: 40,
					topP: 0.9,
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
					invocationKwargs: {},
				}),
			);
		});

		it('should remove topP from model when not explicitly set', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return { temperature: 0.7 };
				return undefined;
			});

			const mockModel = createMockModel({
				topP: -1,
				temperature: 0.7,
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			// Verify topP was deleted from the model instance
			expect(mockModel).not.toHaveProperty('topP');
		});

		it('should keep topP on model when explicitly set', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return { topP: 0.9 };
				return undefined;
			});

			const mockModel = createMockModel({
				topP: 0.9,
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			// Verify topP was not deleted from the model instance
			expect(mockModel).toHaveProperty('topP', 0.9);
		});

		it('should remove temperature when topP is set but temperature is not', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return { topP: 0.9 };
				return undefined;
			});

			const mockModel = createMockModel({
				topP: 0.9,
				temperature: 0.7,
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			// Verify temperature was deleted from the model instance
			expect(mockModel).not.toHaveProperty('temperature');
			expect(mockModel).toHaveProperty('topP', 0.9);
		});

		it('should keep temperature when both topP and temperature are set', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return { topP: 0.9, temperature: 0.8 };
				return undefined;
			});

			const mockModel = createMockModel({
				topP: 0.9,
				temperature: 0.8,
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			// Verify both properties remain
			expect(mockModel).toHaveProperty('topP', 0.9);
			expect(mockModel).toHaveProperty('temperature', 0.8);
		});

		it('should configure thinking mode correctly when enabled', async () => {
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
				}),
			);
		});

		it('should use default thinking budget when not specified', async () => {
			const mockContext = setupMockContext();
			const options = {
				thinking: true,
			};

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return options;
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(MockedChatAnthropic).toHaveBeenCalledWith(
				expect.objectContaining({
					invocationKwargs: {
						thinking: {
							type: 'enabled',
							budget_tokens: 1024, // MIN_THINKING_BUDGET
						},
						max_tokens: 4096, // DEFAULT_MAX_TOKENS
						top_k: undefined,
						top_p: undefined,
						temperature: undefined,
					},
				}),
			);
		});

		it('should unset sampling parameters when thinking mode is enabled', async () => {
			const mockContext = setupMockContext();
			const options = {
				thinking: true,
				thinkingBudget: 2048,
				maxTokensToSample: 4096,
				temperature: 0.8,
				topK: 40,
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
					// These are set initially but will be overridden by invocationKwargs
					temperature: 0.8,
					topK: 40,
					topP: 0.9,
					invocationKwargs: {
						thinking: {
							type: 'enabled',
							budget_tokens: 2048,
						},
						max_tokens: 4096,
						// These override the model options
						top_k: undefined,
						top_p: undefined,
						temperature: undefined,
					},
				}),
			);
		});

		it('should create N8nLlmTracing callback with tokens usage parser', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(MockedN8nLlmTracing).toHaveBeenCalledWith(
				mockContext,
				expect.objectContaining({
					tokensUsageParser: expect.any(Function),
				}),
			);
		});

		it('should create failed attempt handler without gateway handler for direct API', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(mockedMakeN8nLlmFailedAttemptHandler).toHaveBeenCalledWith(mockContext, undefined);
		});

		it('should create failed attempt handler with gateway handler for custom URL', async () => {
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				url: 'https://ai-gateway.example.com',
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(mockedMakeN8nLlmFailedAttemptHandler).toHaveBeenCalledWith(
				mockContext,
				expect.any(Function),
			);
		});

		it('should enrich model-not-found errors with gateway hint when using custom URL', async () => {
			const gatewayURL = 'https://ai-gateway.example.com';
			const mockContext = setupMockContext();

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				url: gatewayURL,
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			// Capture the gateway handler passed to makeN8nLlmFailedAttemptHandler
			let capturedHandler: ((error: unknown) => void) | undefined;
			mockedMakeN8nLlmFailedAttemptHandler.mockImplementation((_ctx, handler) => {
				capturedHandler = handler as (error: unknown) => void;
				return jest.fn();
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(capturedHandler).toBeDefined();

			// Model-not-found error should be enriched
			expect(() => capturedHandler!(new Error('model not found'))).toThrow(NodeOperationError);
			expect(() => capturedHandler!(new Error('model not found'))).toThrow(
				/ai-gateway\.example\.com/,
			);

			// Non-model errors should pass through without throwing
			expect(() => capturedHandler!(new Error('rate limit exceeded'))).not.toThrow();
		});

		it('should throw when model is empty (v1.3)', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return '';
				if (paramName === 'options') return {};
				return undefined;
			});

			await expect(lmChatAnthropic.supplyData.call(mockContext, 0)).rejects.toThrow(
				NodeOperationError,
			);
			expect(MockedChatAnthropic).not.toHaveBeenCalled();
		});

		it('should throw when model is empty (v1.2)', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.2 });

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return '';
				if (paramName === 'options') return {};
				return undefined;
			});

			await expect(lmChatAnthropic.supplyData.call(mockContext, 0)).rejects.toThrow(
				NodeOperationError,
			);
			expect(MockedChatAnthropic).not.toHaveBeenCalled();
		});

		it('should use gateway-provided model name via custom base URL without hardcoded defaults', async () => {
			const gatewayURL = 'https://ai-gateway.example.com';
			const gatewayModel = 'my-org/claude-3-sonnet';
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'gateway-api-key',
				url: gatewayURL,
			});

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return gatewayModel;
				if (paramName === 'options') return {};
				return undefined;
			});

			await lmChatAnthropic.supplyData.call(mockContext, 0);

			expect(MockedChatAnthropic).toHaveBeenCalledWith(
				expect.objectContaining({
					anthropicApiKey: 'gateway-api-key',
					model: gatewayModel,
					anthropicApiUrl: gatewayURL,
				}),
			);
		});

		it('should have a default model in v1.3 resource locator', () => {
			const v13ModelField = lmChatAnthropic.description.properties.find(
				(p) =>
					p.name === 'model' &&
					p.type === 'resourceLocator' &&
					p.displayOptions?.show?.['@version']?.[0] !== undefined,
			);

			expect(v13ModelField).toBeDefined();
			expect(v13ModelField!.default).toEqual({
				mode: 'list',
				value: 'claude-sonnet-4-5-20250929',
				cachedResultName: 'Claude Sonnet 4.5',
			});
		});
	});

	describe('methods', () => {
		it('should have searchModels method', () => {
			expect(lmChatAnthropic.methods).toEqual({
				listSearch: {
					searchModels: expect.any(Function),
				},
			});
		});
	});
});
