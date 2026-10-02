/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { OpenAI } from '@langchain/openai';
import { makeN8nLlmFailedAttemptHandler, aiClientFetch } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmLemonade } from '../LmLemonade.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const MockedOpenAI = vi.mocked(OpenAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedAiClientFetch = vi.mocked(aiClientFetch);

describe('LmLemonade', () => {
	let node: LmLemonade;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Lemonade Model',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.lmLemonade',
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

		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		return ctx;
	};

	beforeEach(() => {
		node = new LmLemonade();
		vi.clearAllMocks();
	});

	describe('supplyData', () => {
		it('should wire the bounded aiClientFetch into the OpenAI client', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('lemonadeApi');
			expect(MockedOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'Llama-3.2-1B-Instruct-Hybrid',
					configuration: expect.objectContaining({
						fetch: mockedAiClientFetch,
						baseURL: 'http://localhost:8000/api/v1',
					}),
				}),
			);
			expect(result).toEqual({ response: expect.any(Object) });
		});
	});
});
