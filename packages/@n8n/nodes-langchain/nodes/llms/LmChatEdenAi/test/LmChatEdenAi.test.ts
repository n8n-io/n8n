/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatEdenAi } from '../LmChatEdenAi.node';

jest.mock('@langchain/openai');
jest.mock('@n8n/ai-utilities');

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = jest.mocked(getProxyAgent);

describe('LmChatEdenAi', () => {
	let node: LmChatEdenAi;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Eden AI Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatEdenAi',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (nodeOverrides: Partial<INode> = {}) => {
		const nodeDef = { ...mockNodeDef, ...nodeOverrides };
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			nodeDef,
		) as jest.Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = jest.fn().mockResolvedValue({
			apiKey: 'test-key',
			url: 'https://api.edenai.run/v3/llm',
		});
		ctx.getNode = jest.fn().mockReturnValue(nodeDef);
		ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'openai/gpt-4o';
			if (paramName === 'options') return {};
			return undefined;
		});

		MockedN8nLlmTracing.mockImplementation(() => ({}) as unknown as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatEdenAi();
		jest.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'Eden AI Chat Model',
				name: 'lmChatEdenAi',
				group: ['transform'],
				version: [1],
			});
		});

		it('should require edenAiApi credentials', () => {
			expect(node.description.credentials).toEqual([{ name: 'edenAiApi', required: true }]);
		});

		it('should output ai_languageModel', () => {
			expect(node.description.outputs).toEqual(['ai_languageModel']);
			expect(node.description.outputNames).toEqual(['Model']);
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI with basic configuration', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('edenAiApi');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-key',
					model: 'openai/gpt-4o',
					maxRetries: 2,
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});

		it('should pass options to ChatOpenAI', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'anthropic/claude-sonnet-4-5';
				if (paramName === 'options')
					return {
						temperature: 0.5,
						maxTokens: 2000,
						topP: 0.9,
						frequencyPenalty: 0.3,
						presencePenalty: 0.2,
						timeout: 60000,
						maxRetries: 5,
					};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					temperature: 0.5,
					maxTokens: 2000,
					topP: 0.9,
					frequencyPenalty: 0.3,
					presencePenalty: 0.2,
					timeout: 60000,
					maxRetries: 5,
				}),
			);
		});

		it('should set response_format in modelKwargs when responseFormat is provided', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4o';
				if (paramName === 'options') return { responseFormat: 'json_object' };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: { response_format: { type: 'json_object' } },
				}),
			);
		});

		it('should not set modelKwargs when no responseFormat', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: undefined,
				}),
			);
		});

		it('should pass Eden AI base URL in configuration', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			const callArgs = MockedChatOpenAI.mock.calls[0][0];
			expect(callArgs?.configuration?.baseURL).toBe('https://api.edenai.run/v3/llm');
		});

		it('should set fallbacks in modelKwargs when provided', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'google/gemini-2.5-pro';
				if (paramName === 'options')
					return { fallbacks: 'openai/gpt-4o, anthropic/claude-sonnet-4-5' };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: {
						fallbacks: ['openai/gpt-4o', 'anthropic/claude-sonnet-4-5'],
					},
				}),
			);
		});

		it('should not set fallbacks when empty string', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4o';
				if (paramName === 'options') return { fallbacks: '' };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: undefined,
				}),
			);
		});

		it('should set web_search_options in modelKwargs when webSearch is enabled', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4o';
				if (paramName === 'options') return { webSearch: true, webSearchContextSize: 'high' };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: {
						web_search_options: { search_context_size: 'high' },
					},
				}),
			);
		});

		it('should default web search context size to medium', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4o';
				if (paramName === 'options') return { webSearch: true };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: {
						web_search_options: { search_context_size: 'medium' },
					},
				}),
			);
		});

		it('should combine multiple modelKwargs features', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'openai/gpt-4o';
				if (paramName === 'options')
					return {
						responseFormat: 'json_object',
						fallbacks: 'anthropic/claude-sonnet-4-5',
						webSearch: true,
						webSearchContextSize: 'low',
					};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: {
						response_format: { type: 'json_object' },
						fallbacks: ['anthropic/claude-sonnet-4-5'],
						web_search_options: { search_context_size: 'low' },
					},
				}),
			);
		});
	});
});
