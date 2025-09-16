import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { N8nJsonLoader } from '@utils/N8nJsonLoader';

import { processItem } from '../V2/processItem';

jest.mock('@utils/tracing', () => ({
	getTracingConfig: jest.fn().mockReturnValue({}),
}));

jest.mock('langchain/chains', () => ({
	loadSummarizationChain: jest.fn().mockReturnValue({
		invoke: jest.fn().mockResolvedValue({ output_text: 'Mock standard summary' }),
		withConfig: jest.fn().mockReturnThis(),
	}),
}));

const createMockExecuteFunctions = (
	parameters: any,
	typeVersion: number = 2.1,
	inputData: INodeExecutionData[] = [{ json: { text: 'Test content' } }],
) => {
	const mockExecuteFunctions = mock<IExecuteFunctions>();
	const mockLlm = new FakeListChatModel({
		responses: ['Mocked summary'],
	});

	mockExecuteFunctions.getInputData.mockReturnValue(inputData);
	mockExecuteFunctions.getNode.mockReturnValue({
		name: 'ChainSummarization',
		typeVersion,
		parameters: {},
	} as INode);

	mockExecuteFunctions.getInputConnectionData.mockImplementation(async (connectionType) => {
		if (connectionType === NodeConnectionTypes.AiLanguageModel) {
			return mockLlm as BaseLanguageModel;
		}
		if (connectionType === NodeConnectionTypes.AiTextSplitter) {
			return new RecursiveCharacterTextSplitter({ chunkSize: 100, chunkOverlap: 10 });
		}
		return undefined;
	});

	mockExecuteFunctions.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
		const paramMap: Record<string, any> = {
			'options.summarizationMethodAndPrompts.values': parameters.summarizationMethodAndPrompts || {
				summarizationMethod: 'map_reduce',
			},
			'options.batching.batchSize': parameters.batchSize || 1,
			'options.batching.delayBetweenBatches': parameters.delayBetweenBatches || 0,
			chunkSize: parameters.chunkSize || 1000,
			chunkOverlap: parameters.chunkOverlap || 200,
			'options.binaryDataKey': parameters.binaryDataKey || 'data',
		};

		return paramMap[param] !== undefined ? paramMap[param] : defaultValue;
	});

	mockExecuteFunctions.getExecutionCancelSignal.mockReturnValue(undefined as any);

	return mockExecuteFunctions;
};

describe('processItem with batching', () => {
	describe('batching enabled (version 2.1+)', () => {
		it('should use BatchedSummarizationChain when batchSize > 1', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					batchSize: 3,
					delayBetweenBatches: 100,
					summarizationMethodAndPrompts: {
						summarizationMethod: 'map_reduce',
					},
				},
				2.1,
			);

			const item: INodeExecutionData = {
				json: {
					text: 'Test document with multiple sentences. This should be split into chunks for processing.',
				},
			};

			const result = await processItem(mockExecuteFunctions, 0, item, 'nodeInputJson', 'simple');

			expect(result).toBeDefined();
			expect(result).toHaveProperty('output_text');
		});

		it('should use standard chain when batchSize = 1', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					batchSize: 1,
					delayBetweenBatches: 0,
				},
				2.1,
			);

			const item: INodeExecutionData = {
				json: { text: 'Test content' },
			};

			const result = await processItem(mockExecuteFunctions, 0, item, 'nodeInputJson', 'simple');

			expect(result).toBeDefined();
		});

		it('should handle different summarization methods with batching', async () => {
			const methods: Array<'map_reduce' | 'stuff' | 'refine'> = ['map_reduce', 'stuff', 'refine'];

			for (const method of methods) {
				const mockExecuteFunctions = createMockExecuteFunctions(
					{
						batchSize: 2,
						delayBetweenBatches: 50,
						summarizationMethodAndPrompts: {
							summarizationMethod: method,
						},
					},
					2.1,
				);

				const item: INodeExecutionData = {
					json: { text: 'Test content for ' + method },
				};

				const result = await processItem(mockExecuteFunctions, 0, item, 'nodeInputJson', 'simple');

				expect(result).toBeDefined();
				expect(result).toHaveProperty('output_text');
			}
		});

		it('should work with advanced chunking mode', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					batchSize: 2,
					delayBetweenBatches: 50,
				},
				2.1,
			);

			const item: INodeExecutionData = {
				json: { text: 'Test content for advanced chunking' },
			};

			const result = await processItem(mockExecuteFunctions, 0, item, 'nodeInputJson', 'advanced');

			expect(result).toBeDefined();
		});

		it('should handle binary input mode with batching', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					batchSize: 2,
					delayBetweenBatches: 100,
					binaryDataKey: 'document',
				},
				2.1,
			);

			const item: INodeExecutionData = {
				json: {},
				binary: {
					document: {
						data: Buffer.from('Test binary content').toString('base64'),
						mimeType: 'text/plain',
					},
				},
			};

			const result = await processItem(mockExecuteFunctions, 0, item, 'nodeInputBinary', 'simple');

			expect(result).toBeDefined();
		});
	});

	describe('batching disabled (version < 2.1)', () => {
		it('should use standard chain for older versions', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					batchSize: 5, // This should be ignored
					delayBetweenBatches: 100,
				},
				2.0,
			); // Older version

			const item: INodeExecutionData = {
				json: { text: 'Test content' },
			};

			const result = await processItem(mockExecuteFunctions, 0, item, 'nodeInputJson', 'simple');

			expect(result).toBeDefined();
		});
	});

	describe('document loader mode', () => {
		it('should handle document loader input with batching disabled', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions(
				{
					batchSize: 3,
					delayBetweenBatches: 100,
				},
				2.1,
			);

			// Mock document loader returning processed documents
			const mockDocuments = [
				{ pageContent: 'Document 1', metadata: {} },
				{ pageContent: 'Document 2', metadata: {} },
			];

			mockExecuteFunctions.getInputConnectionData.mockImplementation(async (connectionType) => {
				if (connectionType === NodeConnectionTypes.AiLanguageModel) {
					return new FakeListChatModel({ responses: ['Summary'] }) as BaseLanguageModel;
				}
				if (connectionType === NodeConnectionTypes.AiDocument) {
					return mockDocuments;
				}
				return undefined;
			});

			const item: INodeExecutionData = { json: {} };

			const result = await processItem(mockExecuteFunctions, 0, item, 'documentLoader', 'none');

			expect(result).toBeDefined();
		});

		it('should handle N8nJsonLoader document input', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions({}, 2.1);

			const mockLoader = new N8nJsonLoader(mockExecuteFunctions, 'options.');
			mockLoader.processItem = jest
				.fn()
				.mockResolvedValue([{ pageContent: 'Processed content', metadata: {} }]);

			mockExecuteFunctions.getInputConnectionData.mockImplementation(async (connectionType) => {
				if (connectionType === NodeConnectionTypes.AiLanguageModel) {
					return new FakeListChatModel({ responses: ['Summary'] }) as BaseLanguageModel;
				}
				if (connectionType === NodeConnectionTypes.AiDocument) {
					return mockLoader;
				}
				return undefined;
			});

			const item: INodeExecutionData = { json: { text: 'Test' } };

			const result = await processItem(mockExecuteFunctions, 0, item, 'documentLoader', 'none');

			expect(result).toBeDefined();
			expect(mockLoader.processItem).toHaveBeenCalledWith(item, 0);
		});
	});

	describe('error scenarios', () => {
		it('should handle undefined result gracefully', async () => {
			const mockExecuteFunctions = createMockExecuteFunctions({}, 2.1);

			const result = await processItem(
				mockExecuteFunctions,
				0,
				{ json: {} },
				'invalidMode',
				'simple',
			);

			expect(result).toBeUndefined();
		});
	});
});
