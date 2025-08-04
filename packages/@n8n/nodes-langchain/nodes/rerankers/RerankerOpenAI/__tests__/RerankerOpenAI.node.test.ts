import type { ISupplyDataFunctions } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import { RerankerOpenAI } from '../RerankerOpenAI.node';

describe('RerankerOpenAI', () => {
	let rerankerNode: RerankerOpenAI;
	let mockSupplyDataFunctions: ISupplyDataFunctions;

	beforeEach(() => {
		rerankerNode = new RerankerOpenAI();
		mockSupplyDataFunctions = mock<ISupplyDataFunctions>();
	});

	describe('Node Configuration', () => {
		it('should have correct node description', () => {
			expect(rerankerNode.description.displayName).toBe('Reranker OpenAI');
			expect(rerankerNode.description.name).toBe('rerankerOpenAI');
			expect(rerankerNode.description.group).toEqual(['transform']);
			expect(rerankerNode.description.version).toBe(1);
		});

		it('should have correct inputs and outputs', () => {
			expect(rerankerNode.description.inputs).toEqual([]);
			expect(rerankerNode.description.outputs).toEqual(['ai_reranker']);
		});

		it('should require openAIApi credentials', () => {
			expect(rerankerNode.description.credentials).toEqual([
				{
					name: 'openAIApi',
					required: true,
				},
			]);
		});

		it('should have correct properties', () => {
			const properties = rerankerNode.description.properties;
			expect(properties).toHaveLength(2);

			// Model property
			const modelProperty = properties.find((p) => p.name === 'modelName');
			expect(modelProperty).toBeDefined();
			expect(modelProperty?.displayName).toBe('Model');
			expect(modelProperty?.type).toBe('string');
			expect(modelProperty?.required).toBe(true);
			expect(modelProperty?.default).toBe('rerank-1');

			// Top N property
			const topNProperty = properties.find((p) => p.name === 'topN');
			expect(topNProperty).toBeDefined();
			expect(topNProperty?.displayName).toBe('Top N');
			expect(topNProperty?.type).toBe('number');
			expect(topNProperty?.default).toBe(10);
		});
	});

	describe('supplyData', () => {
		beforeEach(() => {
			mockSupplyDataFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'modelName':
						return 'test-model';
					case 'topN':
						return 5;
					default:
						return undefined;
				}
			});

			mockSupplyDataFunctions.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				url: 'https://api.example.com',
			});

			mockSupplyDataFunctions.logger = {
				debug: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
			} as any;
		});

		it('should create reranker with correct parameters', async () => {
			const result = await rerankerNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('modelName', 0);
			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('topN', 0, 10);
			expect(mockSupplyDataFunctions.getCredentials).toHaveBeenCalledWith('openAIApi');

			expect(result).toHaveProperty('response');
			expect(result.response).toBeDefined();
		});

		it('should use default topN value when not provided', async () => {
			mockSupplyDataFunctions.getNodeParameter.mockImplementation(
				(paramName: string, itemIndex: number, defaultValue?: any) => {
					switch (paramName) {
						case 'modelName':
							return 'test-model';
						case 'topN':
							return defaultValue; // Return the default value
						default:
							return undefined;
					}
				},
			);

			await rerankerNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getNodeParameter).toHaveBeenCalledWith('topN', 0, 10);
		});

		it('should handle missing credentials gracefully', async () => {
			mockSupplyDataFunctions.getCredentials.mockRejectedValue(new Error('Credentials not found'));

			await expect(rerankerNode.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				'Credentials not found',
			);
		});
	});
});
