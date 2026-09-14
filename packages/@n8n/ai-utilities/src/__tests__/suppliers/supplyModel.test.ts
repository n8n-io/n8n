import * as openai from '@langchain/openai';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import * as langchainChatModelAdapter from 'src/adapters/langchain-chat-model';
import { supplyModel } from 'src/suppliers/supplyModel';
import * as failedAttemptHandler from 'src/utils/failed-attempt-handler/n8nLlmFailedAttemptHandler';
import * as httpProxyAgent from 'src/utils/http-proxy-agent';
import * as n8nLlmTracing from 'src/utils/n8n-llm-tracing';

const { mockLangchainAdapterInstance } = vi.hoisted(() => ({
	mockLangchainAdapterInstance: { __brand: 'LangchainChatModelAdapter' },
}));

vi.mock('@langchain/openai', () => ({
	ChatOpenAI: vi.fn().mockImplementation(function (this: any) {
		// Return a new object each time so metadata can be set independently
		return { __brand: 'ChatOpenAI', metadata: {} };
	}),
}));

vi.mock('src/utils/http-proxy-agent', () => ({
	getProxyAgent: vi.fn().mockReturnValue({ __agent: true }),
}));

vi.mock('src/utils/n8n-llm-tracing', () => ({
	N8nLlmTracing: vi.fn().mockImplementation(function (this: unknown) {
		return this;
	}),
}));

vi.mock('src/utils/failed-attempt-handler/n8nLlmFailedAttemptHandler', () => ({
	makeN8nLlmFailedAttemptHandler: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock('src/adapters/langchain-chat-model', () => ({
	LangchainChatModelAdapter: vi.fn(function () {
		return mockLangchainAdapterInstance;
	}),
}));

const ChatOpenAI = vi.mocked(openai.ChatOpenAI);
const LangchainChatModelAdapter = vi.mocked(langchainChatModelAdapter.LangchainChatModelAdapter);
const getProxyAgent = vi.mocked(httpProxyAgent.getProxyAgent);
const makeN8nLlmFailedAttemptHandler = vi.mocked(
	failedAttemptHandler.makeN8nLlmFailedAttemptHandler,
);
const N8nLlmTracing = vi.mocked(n8nLlmTracing.N8nLlmTracing);

describe('supplyModel', () => {
	const mockCtx = {
		getNode: vi.fn(),
		addOutputData: vi.fn(),
		addInputData: vi.fn(),
		getNextRunIndex: vi.fn(),
	} as unknown as ISupplyDataFunctions;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('OpenAI model path', () => {
		it('returns response from ChatOpenAI when model has type "openai"', () => {
			const openAiModel = {
				type: 'openai' as const,
				baseUrl: 'https://api.openai.com',
				model: 'gpt-4',
				apiKey: 'test-key',
			};

			const result = supplyModel(mockCtx, openAiModel);

			expect(result.response).toEqual(
				expect.objectContaining({
					__brand: 'ChatOpenAI',
					metadata: {},
				}),
			);
			expect(ChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'gpt-4',
					apiKey: 'test-key',
					configuration: expect.objectContaining({
						baseURL: 'https://api.openai.com',
					}),
					onFailedAttempt: expect.any(Function),
					callbacks: [expect.any(Object)],
				}),
			);
			expect(makeN8nLlmFailedAttemptHandler).toHaveBeenCalledWith(mockCtx, undefined);
			expect(N8nLlmTracing).toHaveBeenCalledWith(mockCtx);
			expect(LangchainChatModelAdapter).not.toHaveBeenCalled();
		});

		it('passes ctx and OpenAI options to ChatOpenAI when model has defaultHeaders and timeout', () => {
			const openAiModel = {
				type: 'openai' as const,
				baseUrl: 'https://api.example.com',
				model: 'gpt-4',
				apiKey: 'key',
				defaultHeaders: { 'X-Custom': 'value' },
				timeout: 60_000,
			};

			supplyModel(mockCtx, openAiModel);

			expect(ChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'gpt-4',
					apiKey: 'key',
					configuration: expect.objectContaining({
						baseURL: 'https://api.example.com',
						defaultHeaders: { 'X-Custom': 'value' },
					}),
				}),
			);
		});

		it('includes providerTools in metadata when model has providerTools', () => {
			const result = supplyModel(mockCtx, {
				type: 'openai' as const,
				baseUrl: 'https://api.openai.com',
				model: 'gpt-4',
				apiKey: 'key',
				providerTools: [{ type: 'provider', name: 'web_search', args: { size: 'medium' } }],
			});

			expect(ChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'gpt-4',
					apiKey: 'key',
				}),
			);

			// Verify that the returned model has the correct metadata with providerTools
			// The providerTools should be mapped to metadata.tools format
			expect((result.response as any).metadata).toEqual({
				tools: [
					{
						type: 'web_search',
						size: 'medium',
					},
				],
			});
		});

		it('maps multiple providerTools correctly in metadata', () => {
			const result = supplyModel(mockCtx, {
				type: 'openai' as const,
				baseUrl: 'https://api.openai.com',
				model: 'gpt-4',
				apiKey: 'key',
				providerTools: [
					{ type: 'provider', name: 'web_search', args: { engine: 'google', limit: 10 } },
					{ type: 'provider', name: 'code_interpreter', args: { timeout: 30 } },
				],
			});

			// Verify that all providerTools are correctly mapped to metadata.tools
			expect((result.response as any).metadata.tools).toHaveLength(2);
			expect((result.response as any).metadata.tools[0]).toEqual({
				type: 'web_search',
				engine: 'google',
				limit: 10,
			});
			expect((result.response as any).metadata.tools[1]).toEqual({
				type: 'code_interpreter',
				timeout: 30,
			});
		});

		it('does not set metadata.tools when providerTools is empty', () => {
			const result = supplyModel(mockCtx, {
				type: 'openai' as const,
				baseUrl: 'https://api.openai.com',
				model: 'gpt-4',
				apiKey: 'key',
				providerTools: [],
			});

			// Empty providerTools should not set metadata.tools
			expect((result.response as any).metadata).toEqual({});
		});

		it('sets timeout in OpenAI class and in fetchOptions', () => {
			supplyModel(mockCtx, {
				type: 'openai' as const,
				baseUrl: 'https://api.openai.com',
				model: 'gpt-4',
				apiKey: 'key',
				timeout: 12345,
			});

			expect(getProxyAgent).toHaveBeenCalledWith('https://api.openai.com', {
				headersTimeout: 12345,
				bodyTimeout: 12345,
			});

			expect(ChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					timeout: 12345,
				}),
			);
		});
	});

	describe('ChatModel (LangchainChatModelAdapter) path', () => {
		it('returns response from LangchainChatModelAdapter when model does not have type "openai"', () => {
			const chatModel = {
				provider: 'anthropic',
				modelId: 'claude-3',
				generate: vi.fn(),
				stream: vi.fn(),
				withTools: vi.fn().mockReturnThis(),
			};

			const result = supplyModel(mockCtx, chatModel);

			expect(result).toEqual({ response: mockLangchainAdapterInstance });
			expect(LangchainChatModelAdapter).toHaveBeenCalledTimes(1);
			expect(LangchainChatModelAdapter).toHaveBeenCalledWith(chatModel, mockCtx);
			expect(ChatOpenAI).not.toHaveBeenCalled();
		});

		it('uses LangchainChatModelAdapter when model has type other than "openai"', () => {
			const modelWithOtherType = {
				type: 'custom',
				provider: 'custom',
				modelId: 'custom-model',
				generate: vi.fn(),
				stream: vi.fn(),
				withTools: vi.fn().mockReturnThis(),
			};

			const result = supplyModel(mockCtx, modelWithOtherType);

			expect(result).toEqual({ response: mockLangchainAdapterInstance });
			expect(LangchainChatModelAdapter).toHaveBeenCalledWith(modelWithOtherType, mockCtx);
			expect(ChatOpenAI).not.toHaveBeenCalled();
		});

		it('uses LangchainChatModelAdapter when model has no type property', () => {
			const modelWithoutType = {
				provider: 'google',
				modelId: 'gemini-pro',
				generate: vi.fn(),
				stream: vi.fn(),
				withTools: vi.fn().mockReturnThis(),
			};

			const result = supplyModel(mockCtx, modelWithoutType);

			expect(result).toEqual({ response: mockLangchainAdapterInstance });
			expect(LangchainChatModelAdapter).toHaveBeenCalledWith(modelWithoutType, mockCtx);
			expect(ChatOpenAI).not.toHaveBeenCalled();
		});
	});
});
