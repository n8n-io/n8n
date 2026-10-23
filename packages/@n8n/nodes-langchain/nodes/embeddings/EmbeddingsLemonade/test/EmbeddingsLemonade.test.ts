/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { OpenAIEmbeddings } from '@langchain/openai';
import { aiClientFetch } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { EmbeddingsLemonade } from '../EmbeddingsLemonade.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const MockedOpenAIEmbeddings = vi.mocked(OpenAIEmbeddings);
const mockedAiClientFetch = vi.mocked(aiClientFetch);

describe('EmbeddingsLemonade', () => {
	let node: EmbeddingsLemonade;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Embeddings Lemonade',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.embeddingsLemonade',
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
			if (paramName === 'model') return 'nomic-embed-text';
			return undefined;
		});
		return ctx;
	};

	beforeEach(() => {
		node = new EmbeddingsLemonade();
		vi.clearAllMocks();
	});

	describe('supplyData', () => {
		it('should wire the bounded aiClientFetch into OpenAIEmbeddings', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('lemonadeApi');
			expect(MockedOpenAIEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'nomic-embed-text',
					configuration: expect.objectContaining({
						fetch: mockedAiClientFetch,
						baseURL: 'http://localhost:8000/api/v1',
					}),
				}),
			);
		});
	});
});
