/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/**
 * Regression test for GHC-6353
 * https://linear.app/n8n/issue/GHC-6353
 * https://github.com/n8n-io/n8n/issues/24362
 *
 * Bug: OpenAI-compatible providers (Aliyun, ModelScope, Cloud.ru, etc.) fail with
 * 404 MODEL_NOT_FOUND when using the OpenAI Chat Model node because:
 * 1. The node defaults to enabling "Use Responses API" (responsesApiEnabled: true)
 * 2. Most OpenAI-compatible providers only support /v1/chat/completions, not Responses API
 * 3. Credential tests pass (they use /v1/models endpoint) but actual chat calls fail
 *
 * Expected behavior: When using OpenAI-compatible providers, the node should either:
 * - Default to responsesApiEnabled: false when custom baseURL is detected
 * - Provide clear error message directing users to disable "Use Responses API"
 * - Auto-detect when Responses API is not supported and fall back gracefully
 */

import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import nock from 'nock';

import { LmChatOpenAi } from '../LMChatOpenAi/LmChatOpenAi.node';

jest.mock('@langchain/openai');
jest.mock('@n8n/ai-utilities');

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = jest.mocked(getProxyAgent);
const { openAiDefaultHeaders: defaultHeaders } = Container.get(AiConfig);

describe('LmChatOpenAi - OpenAI-compatible providers (GHC-6353)', () => {
	let lmChatOpenAi: LmChatOpenAi;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'OpenAI Chat Model',
		typeVersion: 1.3,
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

		mockContext.getCredentials = jest.fn().mockResolvedValue({
			apiKey: 'test-api-key',
		});
		mockContext.getNode = jest.fn().mockReturnValue(node);
		mockContext.getNodeParameter = jest.fn();

		MockedN8nLlmTracing.mockImplementation(() => ({}) as any);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		return mockContext;
	};

	beforeEach(() => {
		lmChatOpenAi = new LmChatOpenAi();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
		nock.cleanAll();
	});

	describe('Aliyun DashScope provider', () => {
		const ALIYUN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
		const ALIYUN_MODEL = 'qwen-turbo';

		it('should fail when Responses API is enabled (default) - reproduces reported bug', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			// Simulate user configuration matching the bug report
			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return ALIYUN_MODEL;
				if (paramName === 'responsesApiEnabled') return true; // Default for v1.3+
				if (paramName === 'options')
					return {
						baseURL: ALIYUN_BASE_URL,
					};
				if (paramName === 'builtInTools') return {};
				return undefined;
			});

			// Mock Aliyun's model listing endpoint (this is what credential test uses - it succeeds)
			nock(ALIYUN_BASE_URL).get('/models').reply(200, {
				data: [
					{
						id: ALIYUN_MODEL,
						object: 'model',
					},
				],
			});

			// Create the model instance
			await lmChatOpenAi.supplyData.call(mockContext, 0);

			// Verify that the node is configured to use Responses API
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: ALIYUN_MODEL,
					useResponsesApi: true, // This is the problem - Aliyun doesn't support this
					configuration: expect.objectContaining({
						baseURL: ALIYUN_BASE_URL,
					}),
				}),
			);

			// This configuration will fail at runtime with 404 MODEL_NOT_FOUND
			// because Aliyun's endpoint doesn't have the Responses API
		});

		it('should work when Responses API is explicitly disabled - workaround from comments', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			// User manually disables Responses API (the workaround)
			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return ALIYUN_MODEL;
				if (paramName === 'responsesApiEnabled') return false; // User disables it
				if (paramName === 'options')
					return {
						baseURL: ALIYUN_BASE_URL,
					};
				if (paramName === 'builtInTools') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			// Verify that Responses API is NOT used
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: ALIYUN_MODEL,
					// useResponsesApi should not be set, or should be false/undefined
					configuration: expect.objectContaining({
						baseURL: ALIYUN_BASE_URL,
					}),
				}),
			);

			// Verify useResponsesApi is not set to true
			const callArgs = MockedChatOpenAI.mock.calls[0][0];
			expect(callArgs.useResponsesApi).not.toBe(true);
		});
	});

	describe('ModelScope provider', () => {
		const MODELSCOPE_BASE_URL = 'https://api-inference.modelscope.cn/v1';
		const MODELSCOPE_MODEL = 'ZhipuAI/GLM-4-7';

		it('should fail with 404 when Responses API is enabled - reproduces GitHub comment', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return MODELSCOPE_MODEL;
				if (paramName === 'responsesApiEnabled') return true; // Default
				if (paramName === 'options')
					return {
						baseURL: MODELSCOPE_BASE_URL,
					};
				if (paramName === 'builtInTools') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: MODELSCOPE_MODEL,
					useResponsesApi: true,
					configuration: expect.objectContaining({
						baseURL: MODELSCOPE_BASE_URL,
					}),
				}),
			);
		});
	});

	describe('Generic OpenAI-compatible provider', () => {
		const CUSTOM_BASE_URL = 'https://custom-llm-provider.example.com/v1';
		const CUSTOM_MODEL = 'custom-model-7b';

		it('should use Responses API by default for v1.3+ - causes issues with non-OpenAI providers', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return CUSTOM_MODEL;
				if (paramName === 'responsesApiEnabled') return true;
				if (paramName === 'options')
					return {
						baseURL: CUSTOM_BASE_URL,
					};
				if (paramName === 'builtInTools') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					useResponsesApi: true,
					configuration: expect.objectContaining({
						baseURL: CUSTOM_BASE_URL,
					}),
				}),
			);
		});

		it('should NOT use Responses API for v1.2 and below - maintains backwards compatibility', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.2 });

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return CUSTOM_MODEL;
				if (paramName === 'options')
					return {
						baseURL: CUSTOM_BASE_URL,
					};
				if (paramName === 'builtInTools') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			// In v1.2 and below, responsesApiEnabled parameter doesn't exist
			// so useResponsesApi should not be set
			const callArgs = MockedChatOpenAI.mock.calls[0][0];
			expect(callArgs.useResponsesApi).toBeUndefined();
		});
	});

	describe('Credential test vs actual usage', () => {
		it('demonstrates why credential test passes but chat calls fail', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });
			const PROVIDER_BASE_URL = 'https://provider.example.com/v1';

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'test-model';
				if (paramName === 'responsesApiEnabled') return true;
				if (paramName === 'options')
					return {
						baseURL: PROVIDER_BASE_URL,
					};
				if (paramName === 'builtInTools') return {};
				return undefined;
			});

			// Credential test calls GET /v1/models - this endpoint exists on most providers
			nock(PROVIDER_BASE_URL).get('/models').reply(200, {
				data: [{ id: 'test-model', object: 'model' }],
			});

			// But when using Responses API, it tries to call a different endpoint
			// that doesn't exist on OpenAI-compatible providers
			// This is what causes the 404 MODEL_NOT_FOUND error

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			// The model is configured with useResponsesApi: true
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					useResponsesApi: true,
				}),
			);

			// At runtime, when ChatOpenAI tries to make a request with Responses API,
			// it will fail because the provider doesn't have that endpoint
		});
	});

	describe('Bug demonstration - Responses API with OpenAI-compatible providers', () => {
		/**
		 * This test SHOULD FAIL once the bug is fixed.
		 *
		 * Currently, when a custom baseURL is provided (indicating an OpenAI-compatible provider),
		 * the node still defaults to enabling Responses API (v1.3+), which causes 404 errors
		 * on providers that don't support it.
		 *
		 * Expected fix: When custom baseURL is detected and user hasn't explicitly set
		 * responsesApiEnabled, it should default to false for better compatibility.
		 */
		it('BUG: enables Responses API by default even with custom baseURL', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			// Simulate Aliyun/ModelScope/etc provider configuration
			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'qwen-turbo';
				if (paramName === 'responsesApiEnabled') return true; // Default value from node definition
				if (paramName === 'options')
					return {
						baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', // Not OpenAI
					};
				if (paramName === 'builtInTools') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			const callArgs = MockedChatOpenAI.mock.calls[0][0];

			// This is the BUG: useResponsesApi is true even with custom provider
			// This causes runtime 404 errors because most OpenAI-compatible providers
			// don't implement the Responses API
			expect(callArgs.useResponsesApi).toBe(true);
			expect(callArgs.configuration.baseURL).toContain('dashscope.aliyuncs.com');

			// Once fixed, this assertion should fail because useResponsesApi should be false
			// when a custom baseURL is detected (unless explicitly enabled by user)
		});

		/**
		 * This test documents the workaround mentioned in GitHub comments.
		 * Users have to manually disable "Use Responses API" to make it work.
		 */
		it('WORKAROUND: manually disabling Responses API makes it work', async () => {
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'qwen-turbo';
				if (paramName === 'responsesApiEnabled') return false; // User manually disables it
				if (paramName === 'options')
					return {
						baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
					};
				if (paramName === 'builtInTools') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			const callArgs = MockedChatOpenAI.mock.calls[0][0];
			expect(callArgs.useResponsesApi).not.toBe(true);
		});
	});

	describe('Proposed fix behavior', () => {
		it('should allow explicit opt-in to Responses API even with custom baseURL', async () => {
			// Some OpenAI-compatible providers might support Responses API in the future
			// So users should still be able to explicitly enable it
			const mockContext = setupMockContext({ typeVersion: 1.3 });

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'custom-model';
				if (paramName === 'responsesApiEnabled') return true; // Explicitly enabled
				if (paramName === 'options')
					return {
						baseURL: 'https://custom-provider.com/v1',
					};
				if (paramName === 'builtInTools') return {};
				return undefined;
			});

			await lmChatOpenAi.supplyData.call(mockContext, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					useResponsesApi: true,
				}),
			);
		});
	});
});
