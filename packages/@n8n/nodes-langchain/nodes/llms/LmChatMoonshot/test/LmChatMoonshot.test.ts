/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatMoonshot } from '../LmChatMoonshot.node';

jest.mock('@langchain/openai');
jest.mock('@n8n/ai-utilities');

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = jest.mocked(getProxyAgent);

describe('LmChatMoonshot', () => {
	let node: LmChatMoonshot;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Moonshot Kimi Chat Model',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.lmChatMoonshot',
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
			apiKey: 'test-moonshot-key',
			url: 'https://api.moonshot.ai/v1',
		});
		ctx.getNode = jest.fn().mockReturnValue(nodeDef);
		ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'kimi-k2.5';
			if (paramName === 'options') return {};
			return undefined;
		});

		MockedN8nLlmTracing.mockImplementation(() => ({}) as unknown as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatMoonshot();
		jest.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'Moonshot Kimi Chat Model',
				name: 'lmChatMoonshot',
				group: ['transform'],
				version: [1],
			});
		});

		it('should require moonshotApi credentials', () => {
			expect(node.description.credentials).toEqual([{ name: 'moonshotApi', required: true }]);
		});

		it('should output ai_languageModel', () => {
			expect(node.description.outputs).toEqual(['ai_languageModel']);
			expect(node.description.outputNames).toEqual(['Model']);
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI with Moonshot base URL', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('moonshotApi');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-moonshot-key',
					model: 'kimi-k2.5',
					maxRetries: 2,
					callbacks: expect.arrayContaining([expect.any(Object)]),
					onFailedAttempt: expect.any(Function),
					configuration: expect.objectContaining({
						baseURL: 'https://api.moonshot.ai/v1',
					}),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});

		it('should pass options to ChatOpenAI', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'moonshot-v1-128k';
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
					model: 'moonshot-v1-128k',
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
				if (paramName === 'model') return 'kimi-k2.5';
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

		it('should configure proxy agent with credentials URL', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(mockedGetProxyAgent).toHaveBeenCalledWith(
				'https://api.moonshot.ai/v1',
				expect.objectContaining({
					headersTimeout: undefined,
					bodyTimeout: undefined,
				}),
			);
		});

		it('should configure proxy agent with custom timeout', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'kimi-k2.5';
				if (paramName === 'options') return { timeout: 120000 };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(mockedGetProxyAgent).toHaveBeenCalledWith(
				'https://api.moonshot.ai/v1',
				expect.objectContaining({
					headersTimeout: 120000,
					bodyTimeout: 120000,
				}),
			);
		});
	});
});
