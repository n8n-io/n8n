/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import {
	makeN8nLlmFailedAttemptHandler,
	getProxyAgent,
	createAiClientFetch,
} from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatLemonade } from '../LmChatLemonade.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);
const mockedCreateAiClientFetch = vi.mocked(createAiClientFetch);
const tracedFetch = vi.fn() as unknown as typeof fetch;

describe('LmChatLemonade', () => {
	let node: LmChatLemonade;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Lemonade Chat Model',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.lmChatLemonade',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = () => {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNodeDef,
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({
			baseUrl: 'http://localhost:8000/api/v1',
			apiKey: '',
		});
		ctx.getNode = vi.fn().mockReturnValue(mockNodeDef);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'Llama-3.2-1B-Instruct-Hybrid';
			if (paramName === 'options') return {};
			return undefined;
		});
		ctx.helpers.getSecureEgressFilter = vi.fn().mockReturnValue({});

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as never);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatLemonade();
		vi.clearAllMocks();
		mockedCreateAiClientFetch.mockReturnValue(tracedFetch);
	});

	describe('supplyData', () => {
		it('should wire the traced aiClientFetch into ChatOpenAI', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);
			expect(mockedCreateAiClientFetch).toHaveBeenCalledWith(ctx);

			expect(ctx.getCredentials).toHaveBeenCalledWith('lemonadeApi');
			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'Llama-3.2-1B-Instruct-Hybrid',
					configuration: expect.objectContaining({
						fetch: tracedFetch,
						baseURL: 'http://localhost:8000/api/v1',
					}),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});
	});
});
