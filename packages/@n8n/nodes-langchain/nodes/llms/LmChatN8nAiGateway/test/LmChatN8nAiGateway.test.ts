/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatN8nAiGateway } from '../LmChatN8nAiGateway.node';

jest.mock('@langchain/openai');
jest.mock('@n8n/ai-utilities');

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = jest.mocked(getProxyAgent);

describe('LmChatN8nAiGateway', () => {
	let node: LmChatN8nAiGateway;

	const mockNodeDef: INode = {
		id: '1',
		name: 'n8n AI Gateway Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatN8nAiGateway',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (paramOverrides: Record<string, unknown> = {}) => {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNodeDef,
		) as jest.Mocked<ISupplyDataFunctions>;

		ctx.getNode = jest.fn().mockReturnValue(mockNodeDef);
		ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
			if (paramName === 'options') return paramOverrides.options ?? {};
			if (paramName === 'model') return paramOverrides.model ?? '';
			return undefined;
		});

		MockedN8nLlmTracing.mockImplementation(() => ({}) as unknown as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatN8nAiGateway();
		jest.clearAllMocks();
		process.env.N8N_AI_GATEWAY_OPENROUTER_API_KEY = 'test-key';
		process.env.N8N_AI_GATEWAY_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
	});

	afterEach(() => {
		delete process.env.N8N_AI_GATEWAY_OPENROUTER_API_KEY;
		delete process.env.N8N_AI_GATEWAY_OPENROUTER_BASE_URL;
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'n8n AI Gateway Model',
				name: 'lmChatN8nAiGateway',
				group: ['transform'],
				version: [1],
			});
		});

		it('should not declare any credentials', () => {
			expect(node.description.credentials).toBeUndefined();
		});

		it('should output ai_languageModel', () => {
			expect(node.description.outputs).toEqual(['ai_languageModel']);
			expect(node.description.outputNames).toEqual(['Model']);
		});

		it('should have a model parameter with isModelSelector and loadOptionsMethod', () => {
			const modelProp = node.description.properties.find((p) => p?.name === 'model');
			expect(modelProp).toBeDefined();
			expect(modelProp?.typeOptions).toEqual(
				expect.objectContaining({
					isModelSelector: true,
					loadOptionsMethod: 'getModels',
				}),
			);
		});
	});

	describe('supplyData', () => {
		it('should use the selected model with API key from env', async () => {
			const ctx = setupMockContext({ model: 'anthropic/claude-sonnet-4' });

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-key',
					model: 'anthropic/claude-sonnet-4',
				}),
			);
		});

		it('should fall back to gpt-4.1-nano when no model is selected', async () => {
			const ctx = setupMockContext({ model: '' });

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'openai/gpt-4.1-nano',
				}),
			);
		});

		it('should pass options to ChatOpenAI', async () => {
			const ctx = setupMockContext({
				model: 'openai/gpt-4.1-nano',
				options: {
					temperature: 0.5,
					maxTokens: 2000,
					topP: 0.9,
					timeout: 60000,
					maxRetries: 5,
				},
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					temperature: 0.5,
					maxTokens: 2000,
					topP: 0.9,
					timeout: 60000,
					maxRetries: 5,
				}),
			);
		});

		it('should set baseURL from env var', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.objectContaining({
						baseURL: 'https://openrouter.ai/api/v1',
					}),
				}),
			);
		});

		it('should include the OpenRouter fetch wrapper', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			const callArgs = MockedChatOpenAI.mock.calls[0][0];
			expect(callArgs?.configuration?.fetch).toEqual(expect.any(Function));
		});
	});
});
