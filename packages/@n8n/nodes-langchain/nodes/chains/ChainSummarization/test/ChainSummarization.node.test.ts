import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeConnectionTypes, sleep } from 'n8n-workflow';

import { ChainSummarizationV2 } from '../V2/ChainSummarizationV2.node';

jest.mock('@utils/tracing', () => ({
	getTracingConfig: jest.fn().mockReturnValue({}),
}));

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	sleep: jest.fn().mockResolvedValue(undefined),
}));

const createExecuteFunctionsMock = (
	parameters: any,
	inputData: INodeExecutionData[] = [
		{ json: { text: 'This is a test document that needs summarization.' } },
	],
	typeVersion = 2.1,
) => {
	const mockExecuteFunctions = mock<IExecuteFunctions>();
	const mockLlm = new FakeListChatModel({
		responses: ['Summary of chunk 1', 'Summary of chunk 2', 'Final combined summary'],
	});

	mockExecuteFunctions.getInputData.mockReturnValue(inputData);
	mockExecuteFunctions.getNode.mockReturnValue({
		name: 'Summarization Chain',
		typeVersion,
		parameters: {},
	} as INode);

	mockExecuteFunctions.getInputConnectionData.mockImplementation(async (connectionType) => {
		if (connectionType === NodeConnectionTypes.AiLanguageModel) {
			return mockLlm as BaseLanguageModel;
		}
		return undefined;
	});

	mockExecuteFunctions.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
		const paramMap: Record<string, any> = {
			operationMode: parameters.operationMode || 'nodeInputJson',
			chunkingMode: parameters.chunkingMode || 'simple',
			chunkSize: parameters.chunkSize || 1000,
			chunkOverlap: parameters.chunkOverlap || 200,
			options: parameters.options || {},
			'options.summarizationMethodAndPrompts.values': parameters.summarizationMethodAndPrompts || {
				summarizationMethod: 'map_reduce',
			},
			'options.batching.batchSize': parameters.batchSize || 1,
			'options.batching.delayBetweenBatches': parameters.delayBetweenBatches || 0,
			'options.binaryDataKey': parameters.binaryDataKey || 'data',
		};

		return paramMap[param] !== undefined ? paramMap[param] : defaultValue;
	});

	mockExecuteFunctions.continueOnFail.mockReturnValue(false);
	mockExecuteFunctions.getExecutionCancelSignal.mockReturnValue(undefined as any);

	// Mock logger
	mockExecuteFunctions.logger = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	} as any;

	// Mock helpers for binary processing
	mockExecuteFunctions.helpers = {
		assertBinaryData: jest.fn().mockReturnValue({
			data: Buffer.from('test data').toString('base64'),
			mimeType: 'text/plain',
		}),
		getBinaryDataBuffer: jest.fn(),
	} as any;

	return mockExecuteFunctions;
};

describe('ChainSummarizationV2 with batching', () => {
	let node: ChainSummarizationV2;

	beforeEach(() => {
		node = new ChainSummarizationV2({
			displayName: 'Summarization Chain',
			name: 'chainSummarization',
			icon: 'fa:link',
			group: ['transform'],
			description: 'Test',
			defaultVersion: 2.1,
		});
		jest.clearAllMocks();
	});

	describe('batch processing with multiple input items', () => {
		it('should process items in batches when batchSize > 1', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					batchSize: 2,
					delayBetweenBatches: 100,
					summarizationMethodAndPrompts: {
						summarizationMethod: 'map_reduce',
					},
				},
				[
					{ json: { text: 'Document 1 content' } },
					{ json: { text: 'Document 2 content' } },
					{ json: { text: 'Document 3 content' } },
					{ json: { text: 'Document 4 content' } },
				],
				2.1,
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(4); // Should process all 4 items

			// Each item should have output
			result[0].forEach((item: any) => {
				expect(item.json).toHaveProperty('output');
			});
		});

		it('should handle batch processing with delays', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					batchSize: 1,
					delayBetweenBatches: 200,
				},
				[{ json: { text: 'Document 1' } }, { json: { text: 'Document 2' } }],
				2.1,
			);

			const result = await node.execute.call(mockExecuteFunctions);

			// Should process all items successfully
			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(2);
		});

		it('should not add delay for single batch', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					batchSize: 5,
					delayBetweenBatches: 100,
				},
				[{ json: { text: 'Document 1' } }, { json: { text: 'Document 2' } }],
				2.1,
			);

			await node.execute.call(mockExecuteFunctions);

			// Should not call sleep when all items fit in one batch
			expect(sleep).not.toHaveBeenCalled();
		});

		it('should handle errors in batch processing with continueOnFail', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					batchSize: 2,
				},
				[
					{ json: { text: 'Valid document' } },
					{ json: { text: 'Document that will cause error' } },
				],
				2.1,
			);

			// Mock continueOnFail to return true
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			// Mock LLM to succeed on first call and fail on second
			const mockLlm = new FakeListChatModel({
				responses: ['Success', 'This will cause error'],
			});

			// Override the _generate method to control when errors happen
			const originalGenerate = mockLlm._generate.bind(mockLlm);
			let callCount = 0;
			mockLlm._generate = jest.fn().mockImplementation(async (...args) => {
				callCount++;
				if (callCount === 2) {
					throw new Error('Processing failed');
				}
				return await originalGenerate.apply(mockLlm, args as any);
			});

			mockExecuteFunctions.getInputConnectionData.mockImplementation(async (connectionType) => {
				if (connectionType === NodeConnectionTypes.AiLanguageModel) {
					return mockLlm as BaseLanguageModel;
				}
				return undefined;
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(2);

			// First item should succeed, second should have error
			expect(result[0][0].json).toHaveProperty('output');
			expect(result[0][1].json).toHaveProperty('error');
		});
	});

	describe('chunk-level batching', () => {
		it('should use batched summarization for chunked documents', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					batchSize: 3,
					delayBetweenBatches: 50,
					chunkSize: 100, // Small chunk size to force multiple chunks
					chunkOverlap: 20,
					summarizationMethodAndPrompts: {
						summarizationMethod: 'map_reduce',
					},
				},
				[
					{
						json: {
							text: 'This is a very long document that will be split into multiple chunks. '.repeat(
								10,
							),
						},
					},
				],
				2.1,
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('output');
		});

		it('should handle different summarization methods with chunk batching', async () => {
			const methods: Array<'map_reduce' | 'stuff' | 'refine'> = ['map_reduce', 'stuff', 'refine'];

			for (const method of methods) {
				const mockExecuteFunctions = createExecuteFunctionsMock(
					{
						batchSize: 2,
						delayBetweenBatches: 25,
						summarizationMethodAndPrompts: {
							summarizationMethod: method,
						},
					},
					[{ json: { text: 'Test document for ' + method + ' method.' } }],
					2.1,
				);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result).toBeDefined();
				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json).toHaveProperty('output');
			}
		});
	});

	describe('backward compatibility', () => {
		it('should use standard processing for version < 2.1', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					batchSize: 5, // Should be ignored
					delayBetweenBatches: 100,
				},
				[{ json: { text: 'Test document' } }],
				2.0,
			); // Older version

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
		});

		it('should use standard processing when batchSize = 1', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					batchSize: 1,
					delayBetweenBatches: 0,
				},
				[{ json: { text: 'Test document' } }],
				2.1,
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
		});
	});

	describe('operation modes', () => {
		it('should handle binary input mode with batching', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					operationMode: 'nodeInputBinary',
					batchSize: 2,
					delayBetweenBatches: 100,
					binaryDataKey: 'document',
				},
				[
					{
						json: { text: 'Binary document content' },
						binary: {
							document: {
								data: Buffer.from('Binary document content').toString('base64'),
								mimeType: 'text/plain',
							},
						},
					},
				],
				2.1,
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
		});

		it('should handle document loader mode', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					operationMode: 'documentLoader',
					batchSize: 3,
					delayBetweenBatches: 50,
				},
				[{ json: { text: 'Document loader test' } }],
				2.1,
			);

			// Mock document loader input
			mockExecuteFunctions.getInputConnectionData.mockImplementation(async (connectionType) => {
				if (connectionType === NodeConnectionTypes.AiLanguageModel) {
					return new FakeListChatModel({ responses: ['Summary'] }) as BaseLanguageModel;
				}
				if (connectionType === NodeConnectionTypes.AiDocument) {
					return [{ pageContent: 'Document content', metadata: {} }];
				}
				return undefined;
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
		});
	});

	describe('error handling', () => {
		it('should throw error when continueOnFail is false', async () => {
			const mockExecuteFunctions = createExecuteFunctionsMock(
				{
					batchSize: 1,
				},
				[{ json: { text: 'Document that will fail' } }],
				2.1,
			);

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);

			// Mock LLM to throw error immediately
			const mockLlm = new FakeListChatModel({
				responses: ['This will fail'],
			});

			// Override the _generate method to always throw an error
			mockLlm._generate = jest.fn().mockRejectedValue(new Error('Processing failed'));

			mockExecuteFunctions.getInputConnectionData.mockImplementation(async (connectionType) => {
				if (connectionType === NodeConnectionTypes.AiLanguageModel) {
					return mockLlm as BaseLanguageModel;
				}
				return undefined;
			});

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('Processing failed');
		});
	});
});
