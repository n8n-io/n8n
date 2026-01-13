import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions, INode, ILoadOptionsFunctions } from 'n8n-workflow';
import { NodeOperationError, NodeConnectionTypes } from 'n8n-workflow';

import { ModelSelector } from '../ModelSelector.node';

// Mock the N8nLlmTracing module completely to avoid module resolution issues
jest.mock('../../llms/N8nLlmTracing', () => ({
	N8nLlmTracing: jest.fn().mockImplementation(() => ({
		handleLLMStart: jest.fn(),
		handleLLMEnd: jest.fn(),
	})),
}));

describe('ModelSelector Node', () => {
	let node: ModelSelector;
	let mockSupplyDataFunction: jest.Mocked<ISupplyDataFunctions>;
	let mockLoadOptionsFunction: jest.Mocked<ILoadOptionsFunctions>;

	beforeEach(() => {
		node = new ModelSelector();
		mockSupplyDataFunction = mock<ISupplyDataFunctions>();
		mockLoadOptionsFunction = mock<ILoadOptionsFunctions>();

		mockSupplyDataFunction.getNode.mockReturnValue({
			name: 'Model Selector',
			typeVersion: 1,
			parameters: {},
		} as INode);

		jest.clearAllMocks();
	});

	describe('description', () => {
		it('should have the expected properties', () => {
			expect(node.description).toBeDefined();
			expect(node.description.name).toBe('modelSelector');
			expect(node.description.displayName).toBe('Model Selector');
			expect(node.description.version).toBe(1);
			expect(node.description.group).toEqual(['transform']);
			expect(node.description.outputs).toEqual([NodeConnectionTypes.AiLanguageModel]);
			expect(node.description.requiredInputs).toBe(1);
		});

		it('should have the correct properties defined', () => {
			expect(node.description.properties).toHaveLength(2);
			expect(node.description.properties[0].name).toBe('numberInputs');
			expect(node.description.properties[1].name).toBe('rules');
		});
	});

	describe('loadOptions methods', () => {
		describe('getModels', () => {
			it('should return correct number of models based on numberInputs parameter', async () => {
				mockLoadOptionsFunction.getCurrentNodeParameter.mockReturnValue(3);

				const result = await node.methods.loadOptions.getModels.call(mockLoadOptionsFunction);

				expect(result).toEqual([
					{ value: 1, name: 'Model 1' },
					{ value: 2, name: 'Model 2' },
					{ value: 3, name: 'Model 3' },
				]);
			});

			it('should default to 2 models when numberInputs is undefined', async () => {
				mockLoadOptionsFunction.getCurrentNodeParameter.mockReturnValue(undefined);

				const result = await node.methods.loadOptions.getModels.call(mockLoadOptionsFunction);

				expect(result).toEqual([
					{ value: 1, name: 'Model 1' },
					{ value: 2, name: 'Model 2' },
				]);
			});
		});
	});

	describe('supplyData', () => {
		const mockModel1: Partial<BaseChatModel> = {
			_llmType: () => 'fake-llm',
			callbacks: [],
		};
		const mockModel2: Partial<BaseChatModel> = {
			_llmType: () => 'fake-llm-2',
			callbacks: undefined,
		};
		const mockModel3: Partial<BaseChatModel> = {
			_llmType: () => 'fake-llm-3',
			callbacks: [{ handleLLMStart: jest.fn() }],
		};

		beforeEach(() => {
			// Note: models array gets reversed in supplyData, so [model1, model2, model3] becomes [model3, model2, model1]
			mockSupplyDataFunction.getInputConnectionData.mockResolvedValue([
				mockModel1,
				mockModel2,
				mockModel3,
			]);
		});

		it('should throw error when no models are connected', async () => {
			mockSupplyDataFunction.getInputConnectionData.mockResolvedValue([]);

			await expect(node.supplyData.call(mockSupplyDataFunction, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error when no rules are defined', async () => {
			mockSupplyDataFunction.getNodeParameter.mockReturnValue([]);

			await expect(node.supplyData.call(mockSupplyDataFunction, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should return the correct model when rule conditions are met', async () => {
			const rules = [
				{
					modelIndex: '2',
					conditions: {},
				},
			];

			mockSupplyDataFunction.getNodeParameter
				.mockReturnValueOnce(rules) // rules.rule parameter
				.mockReturnValueOnce(true); // conditions evaluation

			const result = await node.supplyData.call(mockSupplyDataFunction, 0);

			// After reverse: [model3, model2, model1], so index 2 (1-based) = model2
			expect(result.response).toBe(mockModel2);
		});

		it('should add N8nLlmTracing callback to selected model', async () => {
			const rules = [
				{
					modelIndex: '1',
					conditions: {},
				},
			];

			mockSupplyDataFunction.getNodeParameter
				.mockReturnValueOnce(rules) // rules.rule parameter
				.mockReturnValueOnce(true); // conditions evaluation

			const result = await node.supplyData.call(mockSupplyDataFunction, 0);

			// After reverse: [model3, model2, model1], so index 1 (1-based) = model3
			expect(result.response).toBe(mockModel3);
			expect((result.response as BaseChatModel).callbacks).toHaveLength(2); // original + N8nLlmTracing
		});

		it('should handle models with undefined callbacks', async () => {
			const rules = [
				{
					modelIndex: '2',
					conditions: {},
				},
			];

			mockSupplyDataFunction.getNodeParameter
				.mockReturnValueOnce(rules) // rules.rule parameter
				.mockReturnValueOnce(true); // conditions evaluation

			const result = await node.supplyData.call(mockSupplyDataFunction, 0);

			// After reverse: [model3, model2, model1], so index 2 (1-based) = model2
			expect(result.response).toBe(mockModel2);
			// Should have 1 callback added (N8nLlmTracing)
			expect(Array.isArray((result.response as BaseChatModel).callbacks)).toBe(true);
			expect((result.response as BaseChatModel).callbacks).toHaveLength(2);
		});

		it('should evaluate multiple rules and return first matching model', async () => {
			const rules = [
				{
					modelIndex: '1',
					conditions: {},
				},
				{
					modelIndex: '3',
					conditions: {},
				},
			];

			mockSupplyDataFunction.getNodeParameter
				.mockReturnValueOnce(rules) // rules.rule parameter
				.mockReturnValueOnce(false) // first rule conditions evaluation
				.mockReturnValueOnce(true); // second rule conditions evaluation

			const result = await node.supplyData.call(mockSupplyDataFunction, 0);

			// After reverse: [model3, model2, model1], so index 3 (1-based) = model1
			expect(result.response).toBe(mockModel1);
		});

		it('should throw error when no rules match', async () => {
			const rules = [
				{
					modelIndex: '1',
					conditions: {},
				},
				{
					modelIndex: '2',
					conditions: {},
				},
			];

			mockSupplyDataFunction.getNodeParameter
				.mockReturnValueOnce(rules) // rules.rule parameter
				.mockReturnValueOnce(false) // first rule conditions evaluation
				.mockReturnValueOnce(false); // second rule conditions evaluation

			await expect(node.supplyData.call(mockSupplyDataFunction, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error when model index is invalid (too low)', async () => {
			const rules = [
				{
					modelIndex: '0',
					conditions: {},
				},
			];

			mockSupplyDataFunction.getNodeParameter
				.mockReturnValueOnce(rules) // rules.rule parameter
				.mockReturnValueOnce(true); // conditions evaluation

			await expect(node.supplyData.call(mockSupplyDataFunction, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error when model index is invalid (too high)', async () => {
			const rules = [
				{
					modelIndex: '5',
					conditions: {},
				},
			];

			mockSupplyDataFunction.getNodeParameter
				.mockReturnValueOnce(rules) // rules.rule parameter
				.mockReturnValueOnce(true); // conditions evaluation

			await expect(node.supplyData.call(mockSupplyDataFunction, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should handle string model indices correctly', async () => {
			const rules = [
				{
					modelIndex: '3',
					conditions: {},
				},
			];

			mockSupplyDataFunction.getNodeParameter
				.mockReturnValueOnce(rules) // rules.rule parameter
				.mockReturnValueOnce(true); // conditions evaluation

			const result = await node.supplyData.call(mockSupplyDataFunction, 0);

			// After reverse: [model3, model2, model1], so index 3 (1-based) = model1
			expect(result.response).toBe(mockModel1);
		});

		it('should call getNodeParameter with correct parameters for condition evaluation', async () => {
			const rules = [
				{
					modelIndex: '1',
					conditions: { field: 'value' },
				},
			];

			mockSupplyDataFunction.getNodeParameter
				.mockReturnValueOnce(rules) // rules.rule parameter
				.mockReturnValueOnce(true); // conditions evaluation

			await node.supplyData.call(mockSupplyDataFunction, 0);

			expect(mockSupplyDataFunction.getNodeParameter).toHaveBeenCalledWith(
				'rules.rule[0].conditions',
				0,
				false,
				{ extractValue: true },
			);
		});
	});
});
