/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { aiClientFetch, getProxyAgent, makeN8nLlmFailedAttemptHandler } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatNebius } from '../LmChatNebius.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);
const mockedAiClientFetch = vi.mocked(aiClientFetch);

const BASE_URL = 'https://api.tokenfactory.nebius.com/v1';
const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V4-Flash-0731';
const egressFilter = { policy: 'nebius-test' } as never;

describe('LmChatNebius', () => {
	let node: LmChatNebius;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Nebius Token Factory Chat Model',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.lmChatNebius',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (model = DEFAULT_MODEL, options: Record<string, unknown> = {}) => {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNodeDef,
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'test-nebius-key', url: BASE_URL });
		ctx.getNode = vi.fn().mockReturnValue(mockNodeDef);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return model;
			if (paramName === 'options') return options;
			return undefined;
		});
		ctx.helpers.getSecureEgressFilter = vi.fn().mockReturnValue(egressFilter);

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as never);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatNebius();
		vi.clearAllMocks();
	});

	describe('description', () => {
		it('registers as a language model sub-node with Nebius credentials', () => {
			expect(node.description.name).toBe('lmChatNebius');
			expect(node.description.credentials).toEqual([{ name: 'nebiusApi', required: true }]);
			expect(node.description.outputs).toEqual(['ai_languageModel']);
		});
	});

	describe('supplyData', () => {
		it('wires the Token Factory base URL and the bounded aiClientFetch into ChatOpenAI', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('nebiusApi');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-nebius-key',
					model: DEFAULT_MODEL,
					maxRetries: 2,
					modelKwargs: undefined,
					configuration: expect.objectContaining({
						fetch: mockedAiClientFetch,
						baseURL: BASE_URL,
					}),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});

		it('routes through the proxy agent with the timeout and the secure egress filter', async () => {
			const ctx = setupMockContext(DEFAULT_MODEL, { timeout: 90000 });

			await node.supplyData.call(ctx, 0);

			expect(mockedGetProxyAgent).toHaveBeenCalledWith(
				BASE_URL,
				{ headersTimeout: 90000, bodyTimeout: 90000 },
				egressFilter,
			);
		});

		it('passes sampling options through and honors timeout and retry overrides', async () => {
			const ctx = setupMockContext('Qwen/Qwen3.5-397B-A17B', {
				temperature: 0.2,
				topP: 0.9,
				maxTokens: 512,
				timeout: 120000,
				maxRetries: 5,
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'Qwen/Qwen3.5-397B-A17B',
					temperature: 0.2,
					topP: 0.9,
					maxTokens: 512,
					timeout: 120000,
					maxRetries: 5,
				}),
			);
		});

		it('maps JSON response format to response_format without leaking it as a top-level field', async () => {
			const ctx = setupMockContext(DEFAULT_MODEL, { responseFormat: 'json_object' });

			await node.supplyData.call(ctx, 0);

			const args = MockedChatOpenAI.mock.calls[0][0] as Record<string, unknown>;
			expect(args.modelKwargs).toEqual({ response_format: { type: 'json_object' } });
			expect(args).not.toHaveProperty('responseFormat');
		});
	});
});
