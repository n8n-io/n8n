import type { Embeddings } from '@langchain/core/embeddings';
import { proxyFetch } from '@n8n/ai-utilities';
import { createResultOk } from '@n8n/utils/result';
import type { INode, INodeProperties, ISupplyDataFunctions, NodeEgressFilter } from 'n8n-workflow';
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
	const node = new EmbeddingsGoogleGemini();

	const findProperty = (name: string): INodeProperties | undefined =>
		node.description.properties.find((property) => property.name === name);

	const egressFilter: NodeEgressFilter = {
		validateUrl: vi.fn().mockResolvedValue(createResultOk(undefined)),
		validateConnectionHost: vi.fn().mockReturnValue(createResultOk(undefined)),
		createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
		validateRedirectSync: vi.fn(),
	};

	const setupContext = (options: Record<string, unknown> = {}) => {
		const ctx = mockDeep<ISupplyDataFunctions>();
		ctx.getNode.mockReturnValue(nodeDef);
		ctx.getCredentials.mockResolvedValue({
			apiKey: 'test-key',
			host: 'https://gemini.example.com',
		});
		ctx.getNodeParameter.mockImplementation(((name: string) => {
			if (name === 'modelName') return 'models/gemini-embedding-001';
			if (name === 'options') return options;
			return undefined;
		}) as ISupplyDataFunctions['getNodeParameter']);
		ctx.helpers.getSecureEgressFilter.mockReturnValue(egressFilter);
		return ctx;
	};

	const embedQuery = async (ctx: ISupplyDataFunctions) => {
		const { response } = await node.supplyData.call(ctx, 0);
		return await (response as Embeddings).embedQuery('hello');
	};

	const sentRequestBody = (): Record<string, unknown> => {
		const [{ init }] = mockedProxyFetch.mock.calls[0];
		return JSON.parse(String(init?.body)) as Record<string, unknown>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockedProxyFetch.mockImplementation(
			async () =>
				await Promise.resolve(
					new Response(JSON.stringify({ embedding: { values: [0.1, 0.2] } }), { status: 200 }),
				),
		);
	});

	describe('node description', () => {
		it('describes the dimensionality of the default model correctly', () => {
			// The connection hint is also a notice named `notice`, so match on the content.
			const notice = node.description.properties.find(
				(property) => property.type === 'notice' && property.displayName.includes('dimensionality'),
			);

			expect(findProperty('modelName')?.default).toBe('models/gemini-embedding-001');
			expect(notice?.displayName).toContain('3072-dimensional');
			expect(notice?.displayName).not.toContain('768-dimensional');
		});

		it('exposes an Output Dimensionality option', () => {
			const optionsProperty = findProperty('options');

			expect(optionsProperty?.type).toBe('collection');
			expect(optionsProperty?.options).toContainEqual(
				expect.objectContaining({ name: 'outputDimensionality', type: 'number' }),
			);
		});
	});

	describe('supplyData', () => {
		it('should send embedding requests through the egress filter', async () => {
			const result = await embedQuery(setupContext());

			expect(result).toEqual([0.1, 0.2]);
			expect(mockedProxyFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					input: 'https://gemini.example.com/v1beta/models/gemini-embedding-001:embedContent',
					egressFilter,
				}),
			);
			expect(sentRequestBody()).not.toHaveProperty('outputDimensionality');
		});

		it('should send the configured output dimensionality through the egress filter', async () => {
			const result = await embedQuery(setupContext({ outputDimensionality: 768 }));

			expect(result).toEqual([0.1, 0.2]);
			expect(mockedProxyFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					input: 'https://gemini.example.com/v1beta/models/gemini-embedding-001:embedContent',
					egressFilter,
				}),
			);
			expect(sentRequestBody()).toMatchObject({ outputDimensionality: 768 });
		});

		it('should treat an empty output dimensionality as unset', async () => {
			await embedQuery(setupContext({ outputDimensionality: '' }));

			expect(sentRequestBody()).not.toHaveProperty('outputDimensionality');
		});

		it('should accept an output dimensionality that an expression returns as a string', async () => {
			await embedQuery(setupContext({ outputDimensionality: '768' }));

			expect(sentRequestBody()).toMatchObject({ outputDimensionality: 768 });
		});

		it.each([768.5, 0, -1, 'many'])(
			'should reject the output dimensionality %p before a request is made',
			async (outputDimensionality) => {
				const ctx = setupContext({ outputDimensionality });

				await expect(node.supplyData.call(ctx, 0)).rejects.toThrow('Invalid output dimensionality');
				expect(mockedProxyFetch).not.toHaveBeenCalled();
			},
		);
	});
});
