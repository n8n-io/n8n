import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { SentimentAnalysis } from '../SentimentAnalysis.node';

jest.mock('@utils/tracing', () => ({
	getTracingConfig: jest.fn().mockReturnValue({}),
}));

const createExecuteFunctionsMock = (
	parameters: any,
	fakeLlm: BaseLanguageModel,
	inputData = [{ json: { text: 'This is great!' } }],
	typeVersion = 1.1,
) => {
	const mockExecuteFunctions = mock<IExecuteFunctions>();

	mockExecuteFunctions.getInputData.mockReturnValue(inputData);
	mockExecuteFunctions.getNode.mockReturnValue({
		name: 'Sentiment Analysis',
		typeVersion,
		parameters: {},
	} as INode);

	mockExecuteFunctions.getNodeParameter.mockImplementation((param, itemIndex, defaultValue) => {
		if (param === 'inputText') {
			return parameters.inputText || inputData[itemIndex]?.json?.text || 'Test text';
		}
		if (param === 'options.categories') {
			return parameters.categories || 'Positive, Neutral, Negative';
		}
		if (param === 'options') {
			return {
				systemPromptTemplate: parameters.systemPromptTemplate,
				includeDetailedResults: parameters.includeDetailedResults || false,
				enableAutoFixing:
					parameters.enableAutoFixing !== undefined ? parameters.enableAutoFixing : true,
			};
		}
		if (param === 'options.batching.batchSize') {
			return parameters.batchSize || 5;
		}
		if (param === 'options.batching.delayBetweenBatches') {
			return parameters.delayBetweenBatches || 0;
		}
		return defaultValue;
	});

	mockExecuteFunctions.getInputConnectionData.mockResolvedValue(fakeLlm);
	mockExecuteFunctions.continueOnFail.mockReturnValue(false);

	mockExecuteFunctions.helpers = {
		constructExecutionMetaData: jest.fn().mockImplementation((data, options) => {
			return data.map((item: any) => ({
				...item,
				pairedItem: { item: options?.itemData?.item || 0 },
			}));
		}),
		returnJsonArray: jest.fn().mockImplementation((data) => [{ json: data }]),
	} as any;

	return mockExecuteFunctions;
};

describe('SentimentAnalysis Node', () => {
	let node: SentimentAnalysis;

	beforeEach(() => {
		node = new SentimentAnalysis();
		jest.clearAllMocks();
	});

	describe('execute - basic functionality', () => {
		it('should analyze sentiment with default categories', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{ inputText: 'I love this product!' },
				new FakeListChatModel({
					responses: ['{"sentiment": "Positive", "strength": 0.9, "confidence": 0.95}'],
				}),
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(3); // 3 default categories
			expect(result[0]).toHaveLength(1); // Item goes to Positive category
			expect(result[0][0].json.sentimentAnalysis).toEqual({
				category: 'Positive',
			});
		});

		it('should analyze sentiment with custom categories', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					inputText: 'This is terrible!',
					categories: 'Happy, Sad, Angry',
				},
				new FakeListChatModel({
					responses: ['{"sentiment": "Angry", "strength": 0.8, "confidence": 0.9}'],
				}),
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(3); // 3 custom categories
			expect(result[2]).toHaveLength(1); // Item goes to Angry category (index 2)
			expect(result[2][0].json.sentimentAnalysis).toEqual({
				category: 'Angry',
			});
		});

		it('should include detailed results when enabled', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					inputText: 'I love this!',
					includeDetailedResults: true,
				},
				new FakeListChatModel({
					responses: ['{"sentiment": "Positive", "strength": 0.9, "confidence": 0.95}'],
				}),
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json.sentimentAnalysis).toEqual({
				category: 'Positive',
				strength: 0.9,
				confidence: 0.95,
			});
		});

		it('should handle multiple input items', async () => {
			const inputData = [
				{ json: { text: 'I love this!' } },
				{ json: { text: 'This is okay.' } },
				{ json: { text: 'I hate this!' } },
			];

			const mockExecuteFunctions = createExecuteFunctionsMock(
				{ inputText: '{{$json.text}}' },
				new FakeListChatModel({
					responses: [
						'{"sentiment": "Positive", "strength": 0.9, "confidence": 0.95}',
						'{"sentiment": "Neutral", "strength": 0.5, "confidence": 0.8}',
						'{"sentiment": "Negative", "strength": 0.9, "confidence": 0.9}',
					],
				}),
				inputData,
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1); // Positive
			expect(result[1]).toHaveLength(1); // Neutral
			expect(result[2]).toHaveLength(1); // Negative
		});
	});

	describe('execute - error handling', () => {
		it('should throw error when no categories provided', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					inputText: 'Test text',
					categories: '',
				},
				new FakeListChatModel({ responses: ['test'] }),
			);

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeOperationError);
		});

		it('should handle parsing errors with auto-fixing disabled', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					inputText: 'Test text',
					enableAutoFixing: false,
				},
				new FakeListChatModel({
					responses: ['Invalid JSON response'],
				}),
			);

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeOperationError);
		});

		it('should continue on failure when configured', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					inputText: 'Test text',
					enableAutoFixing: false,
				},
				new FakeListChatModel({
					responses: ['Invalid JSON response'],
				}),
			);

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('error');
		});
	});

	describe('execute - batching (version 1.1+)', () => {
		it('should process items in batches with default settings', async () => {
			const inputData = [
				{ json: { text: 'Great!' } },
				{ json: { text: 'Okay.' } },
				{ json: { text: 'Bad!' } },
			];

			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					inputText: '{{$json.text}}',
					batchSize: 2,
				},
				new FakeListChatModel({
					responses: [
						'{"sentiment": "Positive", "strength": 0.9, "confidence": 0.95}',
						'{"sentiment": "Neutral", "strength": 0.5, "confidence": 0.8}',
						'{"sentiment": "Negative", "strength": 0.9, "confidence": 0.9}',
					],
				}),
				inputData,
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1); // Positive
			expect(result[1]).toHaveLength(1); // Neutral
			expect(result[2]).toHaveLength(1); // Negative
		});

		it('should handle errors in batch processing with continueOnFail', async () => {
			const inputData = [
				{ json: { text: 'Great!' } },
				{ json: { text: 'Invalid text' } },
				{ json: { text: 'Bad!' } },
			];

			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					inputText: '{{$json.text}}',
					batchSize: 2,
					enableAutoFixing: false,
				},
				new FakeListChatModel({
					responses: [
						'{"sentiment": "Positive", "strength": 0.9, "confidence": 0.95}',
						'Invalid JSON',
						'{"sentiment": "Negative", "strength": 0.9, "confidence": 0.9}',
					],
				}),
				inputData,
			);

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(2); // Positive and error item
			expect((result[0][0].json.sentimentAnalysis as any).category).toBe('Positive');
			expect(result[0][1].json).toHaveProperty('error');
			expect(result[2]).toHaveLength(1); // Negative
		});
	});

	describe('execute - sequential processing (version 1.0)', () => {
		it('should process items sequentially in older versions', async () => {
			const inputData = [{ json: { text: 'Great!' } }, { json: { text: 'Okay.' } }];

			const mockExecuteFunctions = createExecuteFunctionsMock(
				{ inputText: '{{$json.text}}' },
				new FakeListChatModel({
					responses: [
						'{"sentiment": "Positive", "strength": 0.9, "confidence": 0.95}',
						'{"sentiment": "Neutral", "strength": 0.5, "confidence": 0.8}',
					],
				}),
				inputData,
				1.0, // Older version
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1); // Positive
			expect(result[1]).toHaveLength(1); // Neutral
		});

		it('should handle errors in sequential processing', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					inputText: 'Test text',
					enableAutoFixing: false,
				},
				new FakeListChatModel({
					responses: ['Invalid JSON'],
				}),
				undefined,
				1.0,
			);

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('error');
		});
	});
});
