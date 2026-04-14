/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatMinimax } from '../LmChatMinimax.node';

jest.mock('@langchain/openai');
jest.mock('@n8n/ai-utilities');

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = jest.mocked(getProxyAgent);

describe('LmChatMinimax', () => {
	let node: LmChatMinimax;

	const mockNodeDef: INode = {
		id: '1',
		name: 'MiniMax Chat Model',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.lmChatMinimax',
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
			apiKey: 'test-minimax-key',
			url: 'https://api.minimax.io/v1',
		});
		ctx.getNode = jest.fn().mockReturnValue(nodeDef);
		ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'MiniMax-M2.7';
			if (paramName === 'options') return {};
			return undefined;
		});

		MockedN8nLlmTracing.mockImplementation(() => ({}) as unknown as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatMinimax();
		jest.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'MiniMax Chat Model',
				name: 'lmChatMinimax',
				group: ['transform'],
				version: [1],
			});
		});

		it('should require minimaxApi credentials', () => {
			expect(node.description.credentials).toEqual([{ name: 'minimaxApi', required: true }]);
		});

		it('should output ai_languageModel', () => {
			expect(node.description.outputs).toEqual(['ai_languageModel']);
			expect(node.description.outputNames).toEqual(['Model']);
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI with Minimax base URL', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('minimaxApi');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-minimax-key',
					model: 'MiniMax-M2.7',
					maxRetries: 2,
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
					configuration: expect.objectContaining({
						baseURL: 'https://api.minimax.io/v1',
					}),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});

		it('should pass options to ChatOpenAI', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'MiniMax-M2.5';
				if (paramName === 'options')
					return {
						temperature: 0.5,
						maxTokens: 2000,
						topP: 0.9,
						timeout: 60000,
						maxRetries: 5,
					};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'MiniMax-M2.5',
					temperature: 0.5,
					maxTokens: 2000,
					topP: 0.9,
					timeout: 60000,
					maxRetries: 5,
				}),
			);
		});

		it('should set reasoning_split by default (hideThinking defaults to true)', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: { reasoning_split: true },
				}),
			);
		});

		it('should not set reasoning_split when hideThinking is false', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'MiniMax-M2.7';
				if (paramName === 'options') return { hideThinking: false };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: undefined,
				}),
			);
		});

		it('should configure proxy agent with credentials URL', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(mockedGetProxyAgent).toHaveBeenCalledWith(
				'https://api.minimax.io/v1',
				expect.objectContaining({
					headersTimeout: undefined,
					bodyTimeout: undefined,
				}),
			);
		});

		it('should configure proxy agent with custom timeout', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'MiniMax-M2.7';
				if (paramName === 'options') return { timeout: 120000 };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(mockedGetProxyAgent).toHaveBeenCalledWith(
				'https://api.minimax.io/v1',
				expect.objectContaining({
					headersTimeout: 120000,
					bodyTimeout: 120000,
				}),
			);
		});
	});
});
