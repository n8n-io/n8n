import { EmbeddingsNvidiaNim } from './EmbeddingsNvidiaNim.node';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { OpenAIEmbeddings } from '@langchain/openai';

describe('EmbeddingsNvidiaNim', () => {
	let node: EmbeddingsNvidiaNim;
	let mockSupplyDataFunctions: jest.Mocked<ISupplyDataFunctions>;

	beforeEach(() => {
		node = new EmbeddingsNvidiaNim();
		mockSupplyDataFunctions = {
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				baseUrl: 'https://test.nvidia.com/v1',
			}),
			getNodeParameter: jest.fn(),
		} as unknown as jest.Mocked<ISupplyDataFunctions>;
	});

	it('should correctly initialize OpenAIEmbeddings with provided parameters', async () => {
		mockSupplyDataFunctions.getNodeParameter.mockImplementation((name) => {
			if (name === 'model') return 'nvidia/llama-3.2-nv-embedqa-1b-v2';
			if (name === 'options') return {
				timeout: 30000,
				maxRetries: 3,
			};
			return {};
		});

		const result = await node.supplyData.call(mockSupplyDataFunctions);

		expect(result).toBeInstanceOf(OpenAIEmbeddings);
		expect(result.modelName).toBe('nvidia/llama-3.2-nv-embedqa-1b-v2');
		expect(result.timeout).toBe(30000);
		expect(result.maxRetries).toBe(3);
		// @ts-ignore
		expect(result.configuration.baseURL).toBe('https://test.nvidia.com/v1');
	});

	it('should handle default baseUrl if not provided', async () => {
		mockSupplyDataFunctions.getCredentials.mockResolvedValue({
			apiKey: 'test-api-key',
		});
		mockSupplyDataFunctions.getNodeParameter.mockReturnValue({});

		const result = await node.supplyData.call(mockSupplyDataFunctions);

		// @ts-ignore
		expect(result.configuration.baseURL).toBe('https://integrate.api.nvidia.com/v1');
	});

	it('should normalize baseUrl by removing trailing slashes', async () => {
		mockSupplyDataFunctions.getCredentials.mockResolvedValue({
			apiKey: 'test-api-key',
			baseUrl: 'https://test.nvidia.com/v1/',
		});
		mockSupplyDataFunctions.getNodeParameter.mockReturnValue({});

		const result = await node.supplyData.call(mockSupplyDataFunctions);

		// @ts-ignore
		expect(result.configuration.baseURL).toBe('https://test.nvidia.com/v1');
	});
});
