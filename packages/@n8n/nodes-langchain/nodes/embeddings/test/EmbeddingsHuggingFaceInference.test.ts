import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { EmbeddingsHuggingFaceInference } from '../EmbeddingsHuggingFaceInference/EmbeddingsHuggingFaceInference.node';

vi.mock('@huggingface/inference', () => ({ PROVIDERS_OR_POLICIES: ['auto'] }));
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
});
