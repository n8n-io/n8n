import type { Embeddings } from '@langchain/core/embeddings';
import { proxyFetch } from '@n8n/ai-utilities';
import { createResultOk } from '@n8n/utils/result';
import type { INode, ISupplyDataFunctions, NodeEgressFilter } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { EmbeddingsGoogleGemini } from '../EmbeddingsGoogleGemini.node';

vi.mock('@n8n/ai-utilities', async () => {
	const actual = await vi.importActual('@n8n/ai-utilities');
	return {
		...(actual as Record<string, unknown>),
		proxyFetch: vi.fn(),
	};
});

const mockedProxyFetch = vi.mocked(proxyFetch);

const nodeDef: INode = {
	id: '1',
	name: 'Embeddings Google Gemini',
	typeVersion: 1,
	type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
	position: [0, 0],
	parameters: {},
};

describe('EmbeddingsGoogleGemini', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should send embedding requests through the egress filter', async () => {
		const egressFilter: NodeEgressFilter = {
			validateUrl: vi.fn().mockResolvedValue(createResultOk(undefined)),
			validateConnectionHost: vi.fn().mockReturnValue(createResultOk(undefined)),
			createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
			validateRedirectSync: vi.fn(),
		};
		const ctx = mockDeep<ISupplyDataFunctions>();
		ctx.getNode.mockReturnValue(nodeDef);
		ctx.getCredentials.mockResolvedValue({
			apiKey: 'test-key',
			host: 'https://gemini.example.com',
		});
		ctx.getNodeParameter.mockReturnValue('models/gemini-embedding-001');
		ctx.helpers.getSecureEgressFilter.mockReturnValue(egressFilter);
		mockedProxyFetch.mockResolvedValue(
			new Response(JSON.stringify({ embedding: { values: [0.1, 0.2] } }), { status: 200 }),
		);

		const { response } = await new EmbeddingsGoogleGemini().supplyData.call(ctx, 0);
		const result = await (response as Embeddings).embedQuery('hello');

		expect(result).toEqual([0.1, 0.2]);
		expect(mockedProxyFetch).toHaveBeenCalledWith(
			expect.objectContaining({
				input: 'https://gemini.example.com/v1beta/models/gemini-embedding-001:embedContent',
				egressFilter,
			}),
		);
	});
});
