/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, getProxyAgent } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatDeepSeek } from '../LmChatDeepSeek.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);

describe('LmChatDeepSeek', () => {
	let node: LmChatDeepSeek;

	const mockNodeDef: INode = {
		id: '1',
		name: 'DeepSeek Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatDeepSeek',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (options: Record<string, unknown> = {}, model = 'deepseek-chat') => {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNodeDef,
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-key',
			url: 'https://api.deepseek.com',
		});
		ctx.getNode = vi.fn().mockReturnValue(mockNodeDef);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return model;
			if (paramName === 'options') return options;
			return undefined;
		});

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as any);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatDeepSeek();
		vi.clearAllMocks();
	});

	describe('supplyData', () => {
		it('creates ChatOpenAI from deepSeekApi credentials with no extra modelKwargs by default', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('deepSeekApi');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-key',
					model: 'deepseek-chat',
					modelKwargs: undefined,
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});

		it('sets response_format in modelKwargs when responseFormat is provided', async () => {
			const ctx = setupMockContext({ responseFormat: 'json_object' });

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: { response_format: { type: 'json_object' } },
				}),
			);
		});

		it('sets reasoning_effort in modelKwargs when reasoningEffort is provided', async () => {
			const ctx = setupMockContext({ reasoningEffort: 'high' }, 'deepseek-reasoner');

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: { reasoning_effort: 'high' },
				}),
			);
		});

		it('includes both response_format and reasoning_effort when both are provided', async () => {
			const ctx = setupMockContext(
				{ responseFormat: 'json_object', reasoningEffort: 'low' },
				'deepseek-reasoner',
			);

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: {
						response_format: { type: 'json_object' },
						reasoning_effort: 'low',
					},
				}),
			);
		});
	});
});
