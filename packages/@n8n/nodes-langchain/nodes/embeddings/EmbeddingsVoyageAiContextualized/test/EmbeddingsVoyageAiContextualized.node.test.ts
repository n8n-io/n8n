/* eslint-disable @typescript-eslint/unbound-method */

import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions, INodeExecutionData, Logger } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { EmbeddingsVoyageAiContextualized } from '../EmbeddingsVoyageAiContextualized.node';

// Mock VoyageAI SDK - define functions that can be referenced
const mockContextualizedEmbed = jest.fn();
const mockEmbed = jest.fn();

jest.mock('voyageai', () => {
	return {
		VoyageAIClient: jest.fn().mockImplementation(() => ({
			contextualizedEmbed: mockContextualizedEmbed,
			embed: mockEmbed,
		})),
	};
});

// Import after mocking
import { VoyageAIClient } from 'voyageai';
const mockVoyageAIClient = VoyageAIClient as jest.MockedClass<typeof VoyageAIClient>;

describe('EmbeddingsVoyageAiContextualized', () => {
	let node: EmbeddingsVoyageAiContextualized;
	let mockContext: MockProxy<ISupplyDataFunctions>;
	let mockLogger: MockProxy<Logger>;

	beforeEach(() => {
		node = new EmbeddingsVoyageAiContextualized();
		mockLogger = mock<Logger>();
		mockContext = mock<ISupplyDataFunctions>({
			logger: mockLogger,
		});

		// Reset mocks
		mockContextualizedEmbed.mockReset();
		mockEmbed.mockReset();
		mockVoyageAIClient.mockClear();

		// Default mock implementations
		mockContext.getCredentials.mockResolvedValue({
			apiKey: 'test-api-key',
			url: 'https://api.voyageai.com/v1',
		});

		mockContext.getNodeParameter.mockImplementation((parameterName: string) => {
			if (parameterName === 'documentIdField') return 'documentId';
			if (parameterName === 'textField') return 'text';
			if (parameterName === 'options') return {};
			return undefined;
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Node Configuration', () => {
		it('should have correct node metadata', () => {
			expect(node.description.displayName).toBe('Embeddings VoyageAI Contextualized');
			expect(node.description.name).toBe('embeddingsVoyageAiContextualized');
			expect(node.description.version).toBe(1);
		});

		it('should require voyageAiApi credentials', () => {
			const credentials = node.description.credentials;
			expect(credentials).toHaveLength(1);
			expect(credentials?.[0].name).toBe('voyageAiApi');
			expect(credentials?.[0].required).toBe(true);
		});

		it('should have required parameters', () => {
			const properties = node.description.properties;
			const documentIdField = properties.find((p) => p.name === 'documentIdField');
			const textField = properties.find((p) => p.name === 'textField');

			expect(documentIdField).toBeDefined();
			expect(documentIdField?.required).toBe(true);
			expect(documentIdField?.default).toBe('documentId');

			expect(textField).toBeDefined();
			expect(textField?.required).toBe(true);
			expect(textField?.default).toBe('text');
		});

		it('should have options collection with correct parameters', () => {
			const properties = node.description.properties;
			const optionsCollection = properties.find((p) => p.name === 'options');

			expect(optionsCollection).toBeDefined();
			expect(optionsCollection?.type).toBe('collection');

			if (optionsCollection && 'options' in optionsCollection) {
				const options = optionsCollection.options as unknown[];
				expect(options.length).toBeGreaterThan(0);

				// Check for inputType option
				const inputTypeOption = options.find((o: unknown) => {
					if (typeof o === 'object' && o !== null && 'name' in o) {
						return o.name === 'inputType';
					}
					return false;
				});
				expect(inputTypeOption).toBeDefined();

				// Check for outputDimension option
				const outputDimensionOption = options.find((o: unknown) => {
					if (typeof o === 'object' && o !== null && 'name' in o) {
						return o.name === 'outputDimension';
					}
					return false;
				});
				expect(outputDimensionOption).toBeDefined();

				// Check for outputDtype option
				const outputDtypeOption = options.find((o: unknown) => {
					if (typeof o === 'object' && o !== null && 'name' in o) {
						return o.name === 'outputDtype';
					}
					return false;
				});
				expect(outputDtypeOption).toBeDefined();
			}
		});
	});

	describe('supplyData', () => {
		it('should create embeddings instance with correct configuration', async () => {
			const mockItems: INodeExecutionData[] = [
				{ json: { documentId: 'doc1', text: 'chunk 1' } },
				{ json: { documentId: 'doc1', text: 'chunk 2' } },
			];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }]],
			});

			const result = await node.supplyData.call(mockContext, 0);

			expect(result.response).toBeDefined();
			expect(mockContext.getCredentials).toHaveBeenCalledWith('voyageAiApi');
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('documentIdField', 0);
			expect(mockContext.getNodeParameter).toHaveBeenCalledWith('textField', 0);
		});

		it('should use default URL when not provided in credentials', async () => {
			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
			});

			const mockItems: INodeExecutionData[] = [{ json: { documentId: 'doc1', text: 'chunk 1' } }];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }]],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockVoyageAIClient).toHaveBeenCalledWith({
				apiKey: 'test-api-key',
				environment: 'https://api.voyageai.com/v1',
			});
		});

		it('should handle custom URL from credentials', async () => {
			mockContext.getCredentials.mockResolvedValue({
				apiKey: 'test-api-key',
				url: 'https://custom.api.com',
			});

			const mockItems: INodeExecutionData[] = [{ json: { documentId: 'doc1', text: 'chunk 1' } }];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }]],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockVoyageAIClient).toHaveBeenCalledWith({
				apiKey: 'test-api-key',
				environment: 'https://custom.api.com',
			});
		});

		it('should handle inputType option', async () => {
			mockContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'documentIdField') return 'documentId';
				if (parameterName === 'textField') return 'text';
				if (parameterName === 'options') return { inputType: 'document' };
				return undefined;
			});

			const mockItems: INodeExecutionData[] = [{ json: { documentId: 'doc1', text: 'chunk 1' } }];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }]],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockContextualizedEmbed).toHaveBeenCalledWith({
				inputs: [['chunk 1']],
				model: 'voyage-context-3',
				inputType: 'document',
				outputDimension: undefined,
				outputDtype: undefined,
			});
		});

		it('should convert empty string inputType to undefined', async () => {
			mockContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'documentIdField') return 'documentId';
				if (parameterName === 'textField') return 'text';
				if (parameterName === 'options') return { inputType: '' };
				return undefined;
			});

			const mockItems: INodeExecutionData[] = [{ json: { documentId: 'doc1', text: 'chunk 1' } }];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }]],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockContextualizedEmbed).toHaveBeenCalledWith({
				inputs: [['chunk 1']],
				model: 'voyage-context-3',
				inputType: undefined,
				outputDimension: undefined,
				outputDtype: undefined,
			});
		});

		it('should handle outputDimension option', async () => {
			mockContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'documentIdField') return 'documentId';
				if (parameterName === 'textField') return 'text';
				if (parameterName === 'options') return { outputDimension: 512 };
				return undefined;
			});

			const mockItems: INodeExecutionData[] = [{ json: { documentId: 'doc1', text: 'chunk 1' } }];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: new Array(512).fill(0.1) }]],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockContextualizedEmbed).toHaveBeenCalledWith({
				inputs: [['chunk 1']],
				model: 'voyage-context-3',
				inputType: undefined,
				outputDimension: 512,
				outputDtype: undefined,
			});
		});

		it('should convert 0 outputDimension to undefined', async () => {
			mockContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'documentIdField') return 'documentId';
				if (parameterName === 'textField') return 'text';
				if (parameterName === 'options') return { outputDimension: 0 };
				return undefined;
			});

			const mockItems: INodeExecutionData[] = [{ json: { documentId: 'doc1', text: 'chunk 1' } }];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }]],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockContextualizedEmbed).toHaveBeenCalledWith({
				inputs: [['chunk 1']],
				model: 'voyage-context-3',
				inputType: undefined,
				outputDimension: undefined,
				outputDtype: undefined,
			});
		});

		it('should handle outputDtype option', async () => {
			mockContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'documentIdField') return 'documentId';
				if (parameterName === 'textField') return 'text';
				if (parameterName === 'options') return { outputDtype: 'int8' };
				return undefined;
			});

			const mockItems: INodeExecutionData[] = [{ json: { documentId: 'doc1', text: 'chunk 1' } }];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [1, 2, 3] }]],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockContextualizedEmbed).toHaveBeenCalledWith({
				inputs: [['chunk 1']],
				model: 'voyage-context-3',
				inputType: undefined,
				outputDimension: undefined,
				outputDtype: 'int8',
			});
		});

		it('should handle custom field names', async () => {
			mockContext.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'documentIdField') return 'doc_id';
				if (parameterName === 'textField') return 'content';
				if (parameterName === 'options') return {};
				return undefined;
			});

			const mockItems: INodeExecutionData[] = [
				{ json: { doc_id: 'doc1', content: 'chunk 1' } },
				{ json: { doc_id: 'doc1', content: 'chunk 2' } },
			];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }]],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockContextualizedEmbed).toHaveBeenCalledWith({
				inputs: [['chunk 1', 'chunk 2']],
				model: 'voyage-context-3',
				inputType: undefined,
				outputDimension: undefined,
				outputDtype: undefined,
			});
		});
	});

	describe('Auto-Grouping Logic', () => {
		it('should group chunks by document ID', async () => {
			const mockItems: INodeExecutionData[] = [
				{ json: { documentId: 'doc1', text: 'chunk 1' } },
				{ json: { documentId: 'doc1', text: 'chunk 2' } },
				{ json: { documentId: 'doc2', text: 'chunk 3' } },
			];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [
					[{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }],
					[{ embedding: [0.7, 0.8, 0.9] }],
				],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockContextualizedEmbed).toHaveBeenCalledWith(
				expect.objectContaining({
					inputs: [['chunk 1', 'chunk 2'], ['chunk 3']],
				}),
			);
		});

		it('should handle single document with multiple chunks', async () => {
			const mockItems: INodeExecutionData[] = [
				{ json: { documentId: 'doc1', text: 'chunk 1' } },
				{ json: { documentId: 'doc1', text: 'chunk 2' } },
				{ json: { documentId: 'doc1', text: 'chunk 3' } },
			];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [
					[
						{ embedding: [0.1, 0.2, 0.3] },
						{ embedding: [0.4, 0.5, 0.6] },
						{ embedding: [0.7, 0.8, 0.9] },
					],
				],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockContextualizedEmbed).toHaveBeenCalledWith(
				expect.objectContaining({
					inputs: [['chunk 1', 'chunk 2', 'chunk 3']],
				}),
			);
		});

		it('should handle multiple documents with single chunk each', async () => {
			const mockItems: INodeExecutionData[] = [
				{ json: { documentId: 'doc1', text: 'chunk 1' } },
				{ json: { documentId: 'doc2', text: 'chunk 2' } },
				{ json: { documentId: 'doc3', text: 'chunk 3' } },
			];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [
					[{ embedding: [0.1, 0.2, 0.3] }],
					[{ embedding: [0.4, 0.5, 0.6] }],
					[{ embedding: [0.7, 0.8, 0.9] }],
				],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockContextualizedEmbed).toHaveBeenCalledWith(
				expect.objectContaining({
					inputs: [['chunk 1'], ['chunk 2'], ['chunk 3']],
				}),
			);
		});

		it('should preserve chunk order within documents', async () => {
			const mockItems: INodeExecutionData[] = [
				{ json: { documentId: 'doc1', text: 'chunk 1' } },
				{ json: { documentId: 'doc2', text: 'chunk 3' } },
				{ json: { documentId: 'doc1', text: 'chunk 2' } },
				{ json: { documentId: 'doc2', text: 'chunk 4' } },
			];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [
					[{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.2, 0.3, 0.4] }],
					[{ embedding: [0.3, 0.4, 0.5] }, { embedding: [0.4, 0.5, 0.6] }],
				],
			});

			await node.supplyData.call(mockContext, 0);

			// The order should follow first appearance of document ID
			expect(mockContextualizedEmbed).toHaveBeenCalledWith(
				expect.objectContaining({
					inputs: [
						['chunk 1', 'chunk 2'],
						['chunk 3', 'chunk 4'],
					],
				}),
			);
		});

		it('should convert document IDs to strings', async () => {
			const mockItems: INodeExecutionData[] = [
				{ json: { documentId: 123, text: 'chunk 1' } },
				{ json: { documentId: 123, text: 'chunk 2' } },
			];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }]],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockContextualizedEmbed).toHaveBeenCalled();
		});
	});

	describe('Validation', () => {
		it('should throw NodeOperationError when document ID is missing', async () => {
			const mockItems: INodeExecutionData[] = [
				{ json: { text: 'chunk 1' } }, // Missing documentId
			];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }]],
			});

			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(NodeOperationError);
			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(
				'Missing document ID in field: documentId',
			);
		});

		it('should throw NodeOperationError when document ID is null', async () => {
			const mockItems: INodeExecutionData[] = [{ json: { documentId: null, text: 'chunk 1' } }];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }]],
			});

			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(NodeOperationError);
			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(
				'Missing document ID in field: documentId',
			);
		});

		it('should throw NodeOperationError when text field is missing', async () => {
			const mockItems: INodeExecutionData[] = [
				{ json: { documentId: 'doc1' } }, // Missing text
			];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }]],
			});

			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(NodeOperationError);
			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(
				'Missing text in field: text',
			);
		});

		it('should throw NodeOperationError when text field is empty string', async () => {
			const mockItems: INodeExecutionData[] = [{ json: { documentId: 'doc1', text: '' } }];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }]],
			});

			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(NodeOperationError);
			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(
				'Missing text in field: text',
			);
		});

		it('should throw NodeOperationError when exceeding 1000 document groups', async () => {
			// Create 1001 documents with 1 chunk each
			const mockItems: INodeExecutionData[] = Array.from({ length: 1001 }, (_, i) => ({
				json: { documentId: `doc${i}`, text: `chunk ${i}` },
			}));

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [],
			});

			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(NodeOperationError);
			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(
				'Maximum 1,000 document groups exceeded',
			);
		});

		it('should throw NodeOperationError when exceeding 16000 total chunks', async () => {
			// Create 1 document with 16001 chunks
			const mockItems: INodeExecutionData[] = Array.from({ length: 16001 }, (_, i) => ({
				json: { documentId: 'doc1', text: `chunk ${i}` },
			}));

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [],
			});

			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(NodeOperationError);
			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(
				'Maximum 16,000 chunks exceeded',
			);
		});

		it('should allow exactly 1000 document groups', async () => {
			const mockItems: INodeExecutionData[] = Array.from({ length: 1000 }, (_, i) => ({
				json: { documentId: `doc${i}`, text: `chunk ${i}` },
			}));

			mockContext.getInputData.mockReturnValue(mockItems);

			const mockEmbeddings = Array.from({ length: 1000 }, () => [{ embedding: [0.1, 0.2, 0.3] }]);
			mockContextualizedEmbed.mockResolvedValue({
				data: mockEmbeddings,
			});

			await expect(node.supplyData.call(mockContext, 0)).resolves.toBeDefined();
		});

		it('should allow exactly 16000 chunks', async () => {
			const mockItems: INodeExecutionData[] = Array.from({ length: 16000 }, (_, i) => ({
				json: { documentId: 'doc1', text: `chunk ${i}` },
			}));

			mockContext.getInputData.mockReturnValue(mockItems);

			const mockEmbeddings = [
				Array.from({ length: 16000 }, () => ({ embedding: [0.1, 0.2, 0.3] })),
			];
			mockContextualizedEmbed.mockResolvedValue({
				data: mockEmbeddings,
			});

			await expect(node.supplyData.call(mockContext, 0)).resolves.toBeDefined();
		});
	});

	describe('Error Handling', () => {
		it('should throw NodeOperationError when API returns no data', async () => {
			const mockItems: INodeExecutionData[] = [{ json: { documentId: 'doc1', text: 'chunk 1' } }];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: null,
			});

			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(NodeOperationError);
			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(
				'No embeddings data returned from VoyageAI API',
			);
		});

		it('should throw NodeOperationError when API call fails', async () => {
			const mockItems: INodeExecutionData[] = [{ json: { documentId: 'doc1', text: 'chunk 1' } }];

			mockContext.getInputData.mockReturnValue(mockItems);

			(mockContextualizedEmbed as jest.Mock).mockRejectedValue(new Error('API connection failed'));

			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(NodeOperationError);
			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(
				'VoyageAI API error: API connection failed',
			);
		});

		it('should preserve NodeOperationError when thrown from validation', async () => {
			const mockItems: INodeExecutionData[] = [
				{ json: { documentId: 'doc1', text: '' } }, // Empty text
			];

			mockContext.getInputData.mockReturnValue(mockItems);

			await expect(node.supplyData.call(mockContext, 0)).rejects.toThrow(NodeOperationError);
		});

		it('should log debug information on success', async () => {
			const mockItems: INodeExecutionData[] = [
				{ json: { documentId: 'doc1', text: 'chunk 1' } },
				{ json: { documentId: 'doc1', text: 'chunk 2' } },
				{ json: { documentId: 'doc2', text: 'chunk 3' } },
			];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [
					[{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }],
					[{ embedding: [0.7, 0.8, 0.9] }],
				],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				'Supply data for VoyageAI contextualized embeddings',
			);
		});
	});

	describe('Model Fixed to voyage-context-3', () => {
		it('should always use voyage-context-3 model', async () => {
			const mockItems: INodeExecutionData[] = [{ json: { documentId: 'doc1', text: 'chunk 1' } }];

			mockContext.getInputData.mockReturnValue(mockItems);

			mockContextualizedEmbed.mockResolvedValue({
				data: [[{ embedding: [0.1, 0.2, 0.3] }]],
			});

			await node.supplyData.call(mockContext, 0);

			expect(mockContextualizedEmbed).toHaveBeenCalledWith(
				expect.objectContaining({
					model: 'voyage-context-3',
				}),
			);
		});
	});
});
