import { VoyageAIClient } from 'voyageai';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';

import { EmbeddingsVoyageAiMultimodal } from '../EmbeddingsVoyageAiMultimodal.node';

// Mock the VoyageAIClient
jest.mock('voyageai', () => ({
	VoyageAIClient: jest.fn(),
}));

// Mock the logWrapper utility
jest.mock('@utils/logWrapper', () => ({
	logWrapper: jest.fn().mockImplementation((obj) => ({ logWrapped: obj })),
}));

describe('EmbeddingsVoyageAiMultimodal', () => {
	let embeddingsNode: EmbeddingsVoyageAiMultimodal;
	let mockSupplyDataFunctions: ISupplyDataFunctions;
	let mockVoyageAIClient: jest.Mocked<VoyageAIClient>;

	beforeEach(() => {
		embeddingsNode = new EmbeddingsVoyageAiMultimodal();

		// Reset the mocks
		jest.clearAllMocks();

		// Create a mock VoyageAIClient instance
		mockVoyageAIClient = {
			multimodalEmbed: jest.fn(),
		} as unknown as jest.Mocked<VoyageAIClient>;

		// Make the VoyageAIClient constructor return our mock instance
		(VoyageAIClient as unknown as jest.Mock).mockImplementation(() => mockVoyageAIClient);

		// Create mock supply data functions
		mockSupplyDataFunctions = mock<ISupplyDataFunctions>({
			logger: {
				debug: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
			},
		});

		// Mock specific methods with proper jest functions
		mockSupplyDataFunctions.getNodeParameter = jest.fn();
		mockSupplyDataFunctions.getCredentials = jest.fn();
		mockSupplyDataFunctions.getInputData = jest.fn();
		mockSupplyDataFunctions.helpers = {
			getBinaryDataBuffer: jest.fn(),
		} as any;
	});

	describe('Node Configuration', () => {
		it('should have correct metadata', () => {
			expect(embeddingsNode.description.displayName).toBe('Embeddings VoyageAI Multimodal');
			expect(embeddingsNode.description.name).toBe('embeddingsVoyageAiMultimodal');
			expect(embeddingsNode.description.credentials?.[0].name).toBe('voyageAiApi');
			expect(embeddingsNode.description.version).toBe(1);
		});

		it('should have model fixed to voyage-multimodal-3', () => {
			// The model is hardcoded in the implementation, not a parameter
			expect(embeddingsNode.description.properties.find((p) => p.name === 'model')).toBeUndefined();
		});

		it('should have contentType parameter', () => {
			const contentTypeParam = embeddingsNode.description.properties.find(
				(p) => p.name === 'contentType',
			);
			expect(contentTypeParam).toBeDefined();
			expect(contentTypeParam?.type).toBe('options');
			expect(contentTypeParam?.default).toBe('text');
			expect(contentTypeParam?.required).toBe(true);
		});

		it('should have textInput parameter', () => {
			const textInputParam = embeddingsNode.description.properties.find(
				(p) => p.name === 'textInput',
			);
			expect(textInputParam).toBeDefined();
			expect(textInputParam?.type).toBe('string');
		});

		it('should have imageUrl parameter', () => {
			const imageUrlParam = embeddingsNode.description.properties.find(
				(p) => p.name === 'imageUrl',
			);
			expect(imageUrlParam).toBeDefined();
			expect(imageUrlParam?.type).toBe('string');
		});

		it('should have binaryDataKey parameter', () => {
			const binaryDataKeyParam = embeddingsNode.description.properties.find(
				(p) => p.name === 'binaryDataKey',
			);
			expect(binaryDataKeyParam).toBeDefined();
			expect(binaryDataKeyParam?.type).toBe('string');
			expect(binaryDataKeyParam?.default).toBe('data');
		});

		it('should have options parameter with inputType and truncation', () => {
			const optionsParam = embeddingsNode.description.properties.find((p) => p.name === 'options');
			expect(optionsParam).toBeDefined();
			expect(optionsParam?.type).toBe('collection');

			const options = (optionsParam as any)?.options || [];
			const inputTypeOption = options.find((o: any) => o.name === 'inputType');
			const truncationOption = options.find((o: any) => o.name === 'truncation');

			expect(inputTypeOption).toBeDefined();
			expect(truncationOption).toBeDefined();
			expect(truncationOption?.default).toBe(true);
		});

		it('should have correct content type options', () => {
			const contentTypeParam = embeddingsNode.description.properties.find(
				(p) => p.name === 'contentType',
			);
			const options = (contentTypeParam as any)?.options || [];

			expect(options.length).toBe(5);
			expect(options.map((o: any) => o.value)).toEqual([
				'binary',
				'imageUrl',
				'textAndBinary',
				'textAndImageUrl',
				'text',
			]);
		});
	});

	describe('supplyData - Text Only Mode', () => {
		it('should create embeddings instance for text-only content and pre-compute embeddings', async () => {
			const mockCredentials = { apiKey: 'test-api-key', url: 'https://api.voyageai.com/v1' };
			const mockInputData: INodeExecutionData[] = [
				{
					json: {},
				},
			];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce('Test text input'); // textInput
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			// Mock API response
			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [
					{
						embedding: new Array(1024).fill(0.1),
						index: 0,
					},
				],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			const result = await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.getCredentials).toHaveBeenCalledWith('voyageAiApi');
			expect(mockSupplyDataFunctions.getInputData).toHaveBeenCalled();
			expect(mockVoyageAIClient.multimodalEmbed).toHaveBeenCalledWith({
				inputs: [
					{
						content: [
							{
								type: 'text',
								text: 'Test text input',
							},
						],
					},
				],
				model: 'voyage-multimodal-3',
				inputType: undefined,
				truncation: true,
			});
			expect(logWrapper).toHaveBeenCalled();
			expect(result.response).toBeDefined();
		});

		it('should throw error when text input is empty for text-only mode', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce(''); // textInput (empty)
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			await expect(embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('supplyData - Text + Image URL Mode', () => {
		it('should handle text and image URL combination', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('textAndImageUrl') // contentType
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('https://example.com/image.jpg');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [{ embedding: new Array(1024).fill(0.1), index: 0 }],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockVoyageAIClient.multimodalEmbed).toHaveBeenCalledWith({
				inputs: [
					{
						content: [
							{ type: 'text', text: 'Test text' },
							{ type: 'image_url', imageUrl: 'https://example.com/image.jpg' },
						],
					},
				],
				model: 'voyage-multimodal-3',
				inputType: undefined,
				truncation: true,
			});
		});

		it('should throw error when image URL is missing', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('textAndImageUrl') // contentType
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce(''); // empty imageUrl
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			await expect(embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('supplyData - Image URL Only Mode', () => {
		it('should handle image URL only', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('imageUrl') // contentType
				.mockReturnValueOnce('https://example.com/image.jpg');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [{ embedding: new Array(1024).fill(0.1), index: 0 }],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockVoyageAIClient.multimodalEmbed).toHaveBeenCalledWith({
				inputs: [
					{
						content: [{ type: 'image_url', imageUrl: 'https://example.com/image.jpg' }],
					},
				],
				model: 'voyage-multimodal-3',
				inputType: undefined,
				truncation: true,
			});
		});
	});

	describe('supplyData - Binary Image Mode', () => {
		it('should handle binary image data', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockBinaryData = {
				mimeType: 'image/png',
				fileSize: '1024',
				data: '',
			};
			const mockInputData: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: mockBinaryData,
					},
				},
			];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('binary') // contentType
				.mockReturnValueOnce('data'); // binaryDataKey
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);
			(mockSupplyDataFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('fake-image-data'),
			);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [{ embedding: new Array(1024).fill(0.1), index: 0 }],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
			expect(mockVoyageAIClient.multimodalEmbed).toHaveBeenCalledWith(
				expect.objectContaining({
					inputs: [
						{
							content: [
								expect.objectContaining({
									type: 'image_base64',
									imageBase64: expect.stringContaining('data:image/png;base64,'),
								}),
							],
						},
					],
					model: 'voyage-multimodal-3',
				}),
			);
		});

		it('should throw error when binary data is missing', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [
				{
					json: {},
					binary: {},
				},
			];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('binary') // contentType
				.mockReturnValueOnce('data'); // binaryDataKey
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			await expect(embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error for invalid MIME type', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockBinaryData = {
				mimeType: 'application/pdf',
				fileSize: '1024',
				data: '',
			};
			const mockInputData: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: mockBinaryData,
					},
				},
			];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('binary') // contentType
				.mockReturnValueOnce('data'); // binaryDataKey
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);
			(mockSupplyDataFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('fake-pdf-data'),
			);

			await expect(embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw error when image exceeds size limit', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockBinaryData = {
				mimeType: 'image/png',
				fileSize: String(21 * 1024 * 1024), // 21MB, exceeds 20MB limit
				data: '',
			};
			const mockInputData: INodeExecutionData[] = [
				{
					json: {},
					binary: {
						data: mockBinaryData,
					},
				},
			];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('binary') // contentType
				.mockReturnValueOnce('data'); // binaryDataKey
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			await expect(embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('Options Handling', () => {
		it('should handle inputType option with query value', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];
			const options = { inputType: 'query' };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce(options) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce('Test query');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [{ embedding: new Array(1024).fill(0.1), index: 0 }],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockVoyageAIClient.multimodalEmbed).toHaveBeenCalledWith(
				expect.objectContaining({
					inputType: 'query',
				}),
			);
		});

		it('should handle inputType option with document value', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];
			const options = { inputType: 'document' };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce(options) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce('Test document');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [{ embedding: new Array(1024).fill(0.1), index: 0 }],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockVoyageAIClient.multimodalEmbed).toHaveBeenCalledWith(
				expect.objectContaining({
					inputType: 'document',
				}),
			);
		});

		it('should convert empty string inputType to undefined', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];
			const options = { inputType: '' };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce(options) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce('Test text');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [{ embedding: new Array(1024).fill(0.1), index: 0 }],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockVoyageAIClient.multimodalEmbed).toHaveBeenCalledWith(
				expect.objectContaining({
					inputType: undefined,
				}),
			);
		});

		it('should handle truncation option', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];
			const options = { truncation: false };

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce(options) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce('Test text');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [{ embedding: new Array(1024).fill(0.1), index: 0 }],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockVoyageAIClient.multimodalEmbed).toHaveBeenCalledWith(
				expect.objectContaining({
					truncation: false,
				}),
			);
		});
	});

	describe('Multiple Items Processing', () => {
		it('should handle multiple items in batch', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }, { json: {} }, { json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('text') // contentType for item 0
				.mockReturnValueOnce('First text')
				.mockReturnValueOnce('Second text')
				.mockReturnValueOnce('Third text');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [
					{ embedding: new Array(1024).fill(0.1), index: 0 },
					{ embedding: new Array(1024).fill(0.2), index: 1 },
					{ embedding: new Array(1024).fill(0.3), index: 2 },
				],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 30 },
			} as any);

			await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockVoyageAIClient.multimodalEmbed).toHaveBeenCalledWith(
				expect.objectContaining({
					inputs: [
						{ content: [{ type: 'text', text: 'First text' }] },
						{ content: [{ type: 'text', text: 'Second text' }] },
						{ content: [{ type: 'text', text: 'Third text' }] },
					],
				}),
			);
		});

		it('should throw error when exceeding 1000 inputs limit', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = Array.from({ length: 1001 }, () => ({
				json: {},
			}));

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock).mockReturnValue('text');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			await expect(embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('Error Handling', () => {
		it('should wrap API errors in NodeOperationError', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce('Test text');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockRejectedValue(new Error('API Error'));

			await expect(embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should preserve NodeOperationError when thrown', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce(''); // empty text
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			await expect(embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw NodeOperationError when no embeddings returned', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce('Test text');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await expect(embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should throw NodeOperationError when embeddings count mismatch', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }, { json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce('First text')
				.mockReturnValueOnce('Second text');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [{ embedding: new Array(1024).fill(0.1), index: 0 }], // Only 1 embedding for 2 inputs
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await expect(embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('Logging', () => {
		it('should call logger.debug on initialization', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce('Test text');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [{ embedding: new Array(1024).fill(0.1), index: 0 }],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(mockSupplyDataFunctions.logger.debug).toHaveBeenCalledWith(
				'Supply data for VoyageAI multimodal embeddings',
			);
		});

		it('should wrap embeddings instance with logWrapper', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce('Test text');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [{ embedding: new Array(1024).fill(0.1), index: 0 }],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			expect(logWrapper).toHaveBeenCalledWith(expect.anything(), mockSupplyDataFunctions);
		});
	});

	describe('Base URL Handling', () => {
		it('should use default baseURL when not provided in credentials', async () => {
			const mockCredentials = { apiKey: 'test-api-key' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce('Test text');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [{ embedding: new Array(1024).fill(0.1), index: 0 }],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			// Verify VoyageAIClient was created with default URL
			expect(VoyageAIClient).toHaveBeenCalledWith(
				expect.objectContaining({
					environment: 'https://api.voyageai.com/v1',
				}),
			);
		});

		it('should use custom baseURL from credentials', async () => {
			const mockCredentials = { apiKey: 'test-api-key', url: 'https://custom-api.com/v1' };
			const mockInputData: INodeExecutionData[] = [{ json: {} }];

			(mockSupplyDataFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('text') // contentType
				.mockReturnValueOnce('Test text');
			(mockSupplyDataFunctions.getCredentials as jest.Mock).mockResolvedValue(mockCredentials);
			(mockSupplyDataFunctions.getInputData as jest.Mock).mockReturnValue(mockInputData);

			mockVoyageAIClient.multimodalEmbed.mockResolvedValue({
				data: [{ embedding: new Array(1024).fill(0.1), index: 0 }],
				model: 'voyage-multimodal-3',
				usage: { total_tokens: 10 },
			} as any);

			await embeddingsNode.supplyData.call(mockSupplyDataFunctions, 0);

			// Verify VoyageAIClient was created with custom URL
			expect(VoyageAIClient).toHaveBeenCalledWith(
				expect.objectContaining({
					environment: 'https://custom-api.com/v1',
				}),
			);
		});
	});
});
