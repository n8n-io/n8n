/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { HuggingFaceInference } from '@langchain/community/llms/hf';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmOpenHuggingFaceInference } from '../LMOpenHuggingFaceInference/LmOpenHuggingFaceInference.node';

vi.mock('@langchain/community/llms/hf');
vi.mock('@n8n/ai-utilities');

describe('LmOpenHuggingFaceInference', () => {
	let node: LmOpenHuggingFaceInference;

	const mockNode: INode = {
		id: '1',
		name: 'Hugging Face Inference Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmOpenHuggingFaceInference',
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
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'mistralai/Mistral-Nemo-Base-2407';
			if (paramName === 'options') return options;
			return undefined;
		});
		return ctx;
	};

	beforeEach(() => {
		node = new LmOpenHuggingFaceInference();
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
		expect(HuggingFaceInference).not.toHaveBeenCalled();
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
		expect(HuggingFaceInference).toHaveBeenCalled();
	});
});
