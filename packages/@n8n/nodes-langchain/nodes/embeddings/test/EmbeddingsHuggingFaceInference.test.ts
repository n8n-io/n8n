import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { proxyFetch } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions, NodeEgressFilter } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { EmbeddingsHuggingFaceInference } from '../EmbeddingsHuggingFaceInference/EmbeddingsHuggingFaceInference.node';

vi.mock('@huggingface/inference', () => {
	class InferenceClient {
		constructor(
			readonly accessToken: string,
			readonly options: Record<string, unknown> = {},
		) {}

		endpoint(endpointUrl: string) {
			return new InferenceClient(this.accessToken, { ...this.options, endpointUrl });
		}
	}
	return { PROVIDERS_OR_POLICIES: ['auto'], InferenceClient };
});
vi.mock('@langchain/community/embeddings/hf');
vi.mock('@n8n/ai-utilities');

describe('EmbeddingsHuggingFaceInference', () => {
	let node: EmbeddingsHuggingFaceInference;

	const mockNode: INode = {
		id: '1',
		name: 'Embeddings HuggingFace Inference',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.embeddingsHuggingFaceInference',
		position: [0, 0],
		parameters: {},
	};

	const setup = (credentials: Record<string, unknown>, options: Record<string, unknown>) => {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;
		ctx.getCredentials = vi.fn().mockResolvedValue(credentials);
		ctx.getNode = vi.fn().mockReturnValue(mockNode);
		ctx.logger = { debug: vi.fn() } as unknown as ISupplyDataFunctions['logger'];
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'modelName') return 'sentence-transformers/distilbert-base-nli-mean-tokens';
			if (paramName === 'options') return options;
			return undefined;
		});
		return ctx;
	};

	beforeEach(() => {
		node = new EmbeddingsHuggingFaceInference();
		vi.clearAllMocks();
	});

	it('should reject a custom endpoint URL the credential domain restriction disallows', async () => {
		const ctx = setup(
			{
				apiKey: 'k',
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'api-inference.huggingface.co',
			},
			{ endpointUrl: 'http://127.0.0.1:9099' },
		);

		await expect(node.supplyData.call(ctx, 0)).rejects.toThrow('Domain not allowed');
		expect(HuggingFaceInferenceEmbeddings).not.toHaveBeenCalled();
	});

	it('should allow a custom endpoint URL the credential domain restriction permits', async () => {
		const ctx = setup(
			{
				apiKey: 'k',
				allowedHttpRequestDomains: 'domains',
				allowedDomains: 'my-endpoint.example.com',
			},
			{ endpointUrl: 'https://my-endpoint.example.com' },
		);

		await node.supplyData.call(ctx, 0);
		expect(HuggingFaceInferenceEmbeddings).toHaveBeenCalled();
	});

	it.each([
		['the default endpoint', {}],
		['a custom endpoint', { endpointUrl: 'https://my-endpoint.example.com' }],
	])('should send requests to %s through the egress filter', async (_, options) => {
		const ctx = setup({ apiKey: 'k' }, options);
		const egressFilter = mock<NodeEgressFilter>();
		ctx.helpers.getSecureEgressFilter = vi.fn().mockReturnValue(egressFilter);

		await node.supplyData.call(ctx, 0);

		const client = vi.mocked(HuggingFaceInferenceEmbeddings).mock.instances[0]
			.client as unknown as {
			accessToken: string;
			options: { fetch: typeof fetch; endpointUrl?: string };
		};
		expect(client.accessToken).toBe('k');
		expect(client.options.endpointUrl).toBe(
			'endpointUrl' in options ? options.endpointUrl : undefined,
		);

		await client.options.fetch('https://example.com/embed', { method: 'POST' });
		expect(proxyFetch).toHaveBeenCalledWith({
			input: 'https://example.com/embed',
			init: { method: 'POST' },
			egressFilter,
		});
	});
});
