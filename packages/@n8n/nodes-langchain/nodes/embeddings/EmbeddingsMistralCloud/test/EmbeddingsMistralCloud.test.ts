/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { MistralAIEmbeddings } from '@langchain/mistralai';
import { HTTPClient } from '@mistralai/mistralai/lib/http.js';
import { proxyFetch } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { EmbeddingsMistralCloud } from '../EmbeddingsMistralCloud.node';

vi.mock('@langchain/mistralai');
vi.mock('@mistralai/mistralai/lib/http.js', () => ({ HTTPClient: vi.fn() }));
vi.mock('@n8n/ai-utilities');

const MockedMistralAIEmbeddings = vi.mocked(MistralAIEmbeddings);
const MockedHTTPClient = vi.mocked(HTTPClient);
const mockedProxyFetch = vi.mocked(proxyFetch);

describe('EmbeddingsMistralCloud', () => {
	let node: EmbeddingsMistralCloud;

	const mockNodeDef: INode = {
		id: '1',
		name: 'Embeddings Mistral Cloud',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.embeddingsMistralCloud',
		position: [0, 0],
		parameters: {},
	};

	const egressFilter = { policy: 'test' };

	const setupMockContext = () => {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNodeDef,
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({ apiKey: 'test-mistral-key' });
		ctx.getNode = vi.fn().mockReturnValue(mockNodeDef);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'mistral-embed';
			if (paramName === 'options') return {};
			return undefined;
		});
		ctx.helpers.getSecureEgressFilter = vi.fn().mockReturnValue(egressFilter);
		return ctx;
	};

	beforeEach(() => {
		node = new EmbeddingsMistralCloud();
		vi.clearAllMocks();
	});

	describe('supplyData', () => {
		it('should route the injected http client fetcher through the bounded proxyFetch', async () => {
			const ctx = setupMockContext();

			await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('mistralCloudApi');
			expect(MockedMistralAIEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-mistral-key',
					model: 'mistral-embed',
					httpClient: expect.any(Object),
				}),
			);

			// The MistralAIEmbeddings client only knows the HTTPClient; the bounded fetch
			// lives inside the fetcher passed to it, so drive that fetcher and assert it
			// delegates to proxyFetch with the execution egress filter.
			const httpClientOptions = MockedHTTPClient.mock.calls[0][0];
			await httpClientOptions?.fetcher?.('https://api.mistral.ai/v1/embeddings', {
				method: 'POST',
			});
			expect(mockedProxyFetch).toHaveBeenCalledWith({
				input: 'https://api.mistral.ai/v1/embeddings',
				init: { method: 'POST' },
				timeoutOptions: {},
				egressFilter,
			});
		});
	});
});
