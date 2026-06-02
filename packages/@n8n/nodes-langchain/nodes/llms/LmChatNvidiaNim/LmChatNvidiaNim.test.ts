import { LmChatNvidiaNim } from './LmChatNvidiaNim.node';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { ChatOpenAI } from '@langchain/openai';

describe('LmChatNvidiaNim', () => {
	let node: LmChatNvidiaNim;
	let mockSupplyDataFunctions: jest.Mocked<ISupplyDataFunctions>;

	beforeEach(() => {
		node = new LmChatNvidiaNim();
		mockSupplyDataFunctions = {
			getCredentials: jest.fn().mockResolvedValue({
				apiKey: 'test-api-key',
				baseUrl: 'https://test.nvidia.com/v1',
			}),
			getNodeParameter: jest.fn(),
		} as unknown as jest.Mocked<ISupplyDataFunctions>;
	});

	it('should correctly initialize ChatOpenAI with provided parameters', async () => {
		mockSupplyDataFunctions.getNodeParameter.mockImplementation((name) => {
			if (name === 'model') return 'meta/llama-3.1-8b-instruct';
			if (name === 'options') return {
				temperature: 0.5,
				maxTokens: 512,
				seed: 42,
				responseFormat: 'json_object',
			};
			return {};
		});

		const result = await node.supplyData.call(mockSupplyDataFunctions);

		expect(result).toBeInstanceOf(ChatOpenAI);
		expect(result.modelName).toBe('meta/llama-3.1-8b-instruct');
		expect(result.temperature).toBe(0.5);
		expect(result.maxTokens).toBe(512);
		// @ts-ignore
		expect(result.configuration.baseURL).toBe('https://test.nvidia.com/v1');
		// @ts-ignore
		expect(result.modelKwargs.seed).toBe(42);
		// @ts-ignore
		expect(result.modelKwargs.response_format).toEqual({ type: 'json_object' });
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
