import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import * as binaryDataHelpers from '../../../../helpers/binary-data';
import * as transport from '../../../../transport';
import { execute } from '../../../../v2/actions/image/edit.operation';

vi.mock('../../../../helpers/binary-data');
vi.mock('../../../../transport');

const { mockFormDataAppend, mockFormDataGetHeaders, lastFormDataInstance } = vi.hoisted(() => ({
	mockFormDataAppend: vi.fn(),
	mockFormDataGetHeaders: vi.fn(),
	lastFormDataInstance: { current: null as unknown },
}));

vi.mock('form-data', () => {
	class MockFormData {
		constructor() {
			lastFormDataInstance.current = this;
		}
		append = mockFormDataAppend;
		getHeaders = mockFormDataGetHeaders;
	}
	return { default: MockFormData };
});

describe('Image Edit Operation', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockFormDataInstance: Mocked<FormData>;
	const apiRequestSpy = vi.spyOn(transport, 'apiRequest');
	const getBinaryDataFileSpy = vi.spyOn(binaryDataHelpers, 'getBinaryDataFile');

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'OpenAI Image Edit',
			type: 'n8n-nodes-base.openAi',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		});

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.helpers.prepareBinaryData = vi.fn();
		mockExecuteFunctions.helpers.binaryToBuffer = vi.fn();
		mockFormDataGetHeaders.mockReturnValue({ 'content-type': 'multipart/form-data' });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('successful execution with DALL-E 2', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-2',
					prompt: 'Add a rainbow to this landscape',
					binaryPropertyName: 'image_data',
					n: 1,
					size: '1024x1024',
					quality: 'standard',
					responseFormat: 'url',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});
		});

		it('should edit image with basic parameters', async () => {
			const mockBinaryFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/png',
				filename: 'test.png',
			};

			const mockApiResponse = {
				data: [
					{
						url: 'https://example.com/edited-image.png',
						revised_prompt: 'Add a rainbow to this landscape',
					},
				],
			};

			getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValue(mockApiResponse);

			const result = await execute.call(mockExecuteFunctions, 0);
			mockFormDataInstance = lastFormDataInstance.current as Mocked<FormData>;

			expect(getBinaryDataFileSpy).toHaveBeenCalledWith(mockExecuteFunctions, 0, 'image_data');
			expect(mockExecuteFunctions.helpers.binaryToBuffer).toHaveBeenCalledWith(
				mockBinaryFile.fileContent,
			);

			expect(mockFormDataAppend).toHaveBeenCalledWith('image', mockBinaryFile.fileContent, {
				filename: 'test.png',
				contentType: 'image/png',
			});
			expect(mockFormDataAppend).toHaveBeenCalledWith('prompt', 'Add a rainbow to this landscape');
			expect(mockFormDataAppend).toHaveBeenCalledWith('model', 'dall-e-2');
			expect(mockFormDataAppend).toHaveBeenCalledWith('n', '1');
			expect(mockFormDataAppend).toHaveBeenCalledWith('size', '1024x1024');
			expect(mockFormDataAppend).toHaveBeenCalledWith('response_format', 'url');

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/edits', {
				option: { formData: mockFormDataInstance },
				headers: { 'content-type': 'multipart/form-data' },
			});

			expect(result).toEqual([
				{
					json: {
						url: 'https://example.com/edited-image.png',
						revised_prompt: 'Add a rainbow to this landscape',
					},
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should handle base64 response format', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-2',
					prompt: 'Edit this image',
					binaryPropertyName: 'image_data',
					n: 1,
					size: '512x512',
					quality: 'standard',
					responseFormat: 'b64_json',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/png',
				filename: 'test.png',
			};

			const mockApiResponse = {
				data: [
					{
						b64_json: 'base64encodedimagedata',
					},
				],
			};

			const mockBinaryData = {
				data: 'base64encodedimagedata',
				mimeType: 'image/png',
				fileName: 'data',
			};

			getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(mockExecuteFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
				expect.any(Buffer),
				'data',
			);

			expect(result).toEqual([
				{
					json: {
						data: undefined,
						mimeType: 'image/png',
						fileName: 'data',
					},
					binary: {
						data: mockBinaryData,
					},
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should handle multiple images generation', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-2',
					prompt: 'Create variations of this image',
					binaryPropertyName: 'image_data',
					n: 3,
					size: '256x256',
					quality: 'standard',
					responseFormat: 'url',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/png',
				filename: 'test.png',
			};

			const mockApiResponse = {
				data: [
					{ url: 'https://example.com/edited-image-1.png' },
					{ url: 'https://example.com/edited-image-2.png' },
					{ url: 'https://example.com/edited-image-3.png' },
				],
			};

			getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValue(mockApiResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(mockFormDataAppend).toHaveBeenCalledWith('n', '3');
			expect(result).toHaveLength(3);
			expect(result[0].json.url).toBe('https://example.com/edited-image-1.png');
			expect(result[1].json.url).toBe('https://example.com/edited-image-2.png');
			expect(result[2].json.url).toBe('https://example.com/edited-image-3.png');
		});

		it('should handle image mask option', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-2',
					prompt: 'Edit specific area of image',
					binaryPropertyName: 'image_data',
					n: 1,
					size: '1024x1024',
					quality: 'standard',
					responseFormat: 'url',
					options: {
						imageMask: 'mask_data',
						user: 'test-user-123',
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockImageFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/png',
				filename: 'test.png',
			};

			const mockMaskFile = {
				fileContent: Buffer.from('mock-mask-data'),
				contentType: 'image/png',
				filename: 'mask.png',
			};

			const mockApiResponse = {
				data: [{ url: 'https://example.com/edited-image.png' }],
			};

			getBinaryDataFileSpy.mockResolvedValueOnce(mockImageFile).mockResolvedValueOnce(mockMaskFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock)
				.mockResolvedValueOnce(mockImageFile.fileContent)
				.mockResolvedValueOnce(mockMaskFile.fileContent);
			apiRequestSpy.mockResolvedValue(mockApiResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(getBinaryDataFileSpy).toHaveBeenCalledTimes(2);
			expect(getBinaryDataFileSpy).toHaveBeenNthCalledWith(
				1,
				mockExecuteFunctions,
				0,
				'image_data',
			);
			expect(getBinaryDataFileSpy).toHaveBeenNthCalledWith(2, mockExecuteFunctions, 0, 'mask_data');

			expect(mockFormDataAppend).toHaveBeenCalledWith('image', mockImageFile.fileContent, {
				filename: 'test.png',
				contentType: 'image/png',
			});
			expect(mockFormDataAppend).toHaveBeenCalledWith('mask', mockMaskFile.fileContent, {
				filename: 'mask.png',
				contentType: 'image/png',
			});
			expect(mockFormDataAppend).toHaveBeenCalledWith('user', 'test-user-123');

			expect(result).toHaveLength(1);
		});
	});

	describe('successful execution with GPT Image 1', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-image-1',
					prompt: 'Transform this image with AI magic',
					images: {
						values: [{ binaryPropertyName: 'image1' }, { binaryPropertyName: 'image2' }],
					},
					n: 1,
					size: '1536x1024',
					quality: 'high',
					options: {
						background: 'transparent',
						inputFidelity: 'high',
						outputFormat: 'webp',
						outputCompression: 85,
					},
				};
				return params[paramName as keyof typeof params];
			});
		});

		it('should edit image with GPT Image 1 model', async () => {
			const mockBinaryFile1 = {
				fileContent: Buffer.from('mock-image-data-1'),
				contentType: 'image/jpeg',
				filename: 'image1.jpg',
			};

			const mockBinaryFile2 = {
				fileContent: Buffer.from('mock-image-data-2'),
				contentType: 'image/png',
				filename: 'image2.png',
			};

			const mockApiResponse = {
				data: [
					{
						b64_json: 'base64encodedimagedata',
					},
				],
			};

			const mockBinaryData = {
				data: 'base64encodedimagedata',
				mimeType: 'image/webp',
				fileName: 'data',
			};

			getBinaryDataFileSpy
				.mockResolvedValueOnce(mockBinaryFile1)
				.mockResolvedValueOnce(mockBinaryFile2);
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock)
				.mockResolvedValueOnce(mockBinaryFile1.fileContent)
				.mockResolvedValueOnce(mockBinaryFile2.fileContent);
			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(getBinaryDataFileSpy).toHaveBeenCalledTimes(2);
			expect(getBinaryDataFileSpy).toHaveBeenNthCalledWith(1, mockExecuteFunctions, 0, 'image1');
			expect(getBinaryDataFileSpy).toHaveBeenNthCalledWith(2, mockExecuteFunctions, 0, 'image2');

			expect(mockFormDataAppend).toHaveBeenCalledWith('image[]', mockBinaryFile1.fileContent, {
				filename: 'image1.jpg',
				contentType: 'image/jpeg',
			});
			expect(mockFormDataAppend).toHaveBeenCalledWith('image[]', mockBinaryFile2.fileContent, {
				filename: 'image2.png',
				contentType: 'image/png',
			});
			expect(mockFormDataAppend).toHaveBeenCalledWith(
				'prompt',
				'Transform this image with AI magic',
			);
			expect(mockFormDataAppend).toHaveBeenCalledWith('model', 'gpt-image-1');
			expect(mockFormDataAppend).toHaveBeenCalledWith('background', 'transparent');
			expect(mockFormDataAppend).toHaveBeenCalledWith('input_fidelity', 'high');
			expect(mockFormDataAppend).toHaveBeenCalledWith('output_format', 'webp');
			expect(mockFormDataAppend).toHaveBeenCalledWith('output_compression', '85');
			expect(mockFormDataAppend).toHaveBeenCalledWith('quality', 'high');

			expect(result).toEqual([
				{
					json: {
						data: undefined,
						mimeType: 'image/webp',
						fileName: 'data',
					},
					binary: {
						data: mockBinaryData,
					},
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should handle default images parameter for GPT Image 1', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-image-1',
					prompt: 'Edit this image',
					images: {
						values: [{ binaryPropertyName: 'data' }],
					},
					n: 1,
					size: 'auto',
					quality: 'auto',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/png',
				filename: 'data.png',
			};

			const mockApiResponse = {
				data: [{ b64_json: 'base64encodedimagedata' }],
			};

			const mockBinaryData = {
				data: 'base64encodedimagedata',
				mimeType: 'image/png',
				fileName: 'data',
			};

			getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(mockFormDataAppend).toHaveBeenCalledWith('image[]', mockBinaryFile.fileContent, {
				filename: 'data.png',
				contentType: 'image/png',
			});
			expect(result).toHaveLength(1);
		});
	});

	describe('successful execution with v2.3 (RLC model)', () => {
		it('should extract model from modelId RLC parameter', async () => {
			mockNode = mock<INode>({
				id: 'test-node',
				name: 'OpenAI Image Edit',
				type: 'n8n-nodes-base.openAi',
				typeVersion: 2.3,
				position: [0, 0],
				parameters: {},
			});
			mockExecuteFunctions.getNode.mockReturnValue(mockNode);

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-image-1',
					prompt: 'Edit with RLC model',
					images: {
						values: [{ binaryPropertyName: 'data' }],
					},
					n: 1,
					size: '1024x1024',
					quality: 'auto',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/png',
				filename: 'data.png',
			};

			const mockApiResponse = {
				data: [{ b64_json: 'base64encodedimagedata' }],
			};

			const mockBinaryData = {
				data: 'base64encodedimagedata',
				mimeType: 'image/png',
				fileName: 'data',
			};

			getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(mockFormDataInstance.append).toHaveBeenCalledWith('model', 'gpt-image-1');
			expect(mockFormDataInstance.append).toHaveBeenCalledWith(
				'image[]',
				mockBinaryFile.fileContent,
				{
					filename: 'data.png',
					contentType: 'image/png',
				},
			);
			expect(result).toHaveLength(1);
		});
	});

	describe('parameter validation and edge cases', () => {
		it('should handle missing response data', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-2',
					prompt: 'Edit this image',
					binaryPropertyName: 'image_data',
					n: 1,
					size: '1024x1024',
					quality: 'standard',
					responseFormat: 'url',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/png',
				filename: 'test.png',
			};

			const mockApiResponse = {};

			getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValue(mockApiResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result).toEqual([]);
		});

		it('should handle zero output compression value', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-image-1',
					prompt: 'Edit this image',
					images: {
						values: [{ binaryPropertyName: 'data' }],
					},
					n: 1,
					size: '1024x1024',
					quality: 'auto',
					options: {
						outputCompression: 0,
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/png',
				filename: 'data.png',
			};

			const mockApiResponse = {
				data: [{ b64_json: 'base64encodedimagedata' }],
			};

			const mockBinaryData = {
				data: 'base64encodedimagedata',
				mimeType: 'image/png',
				fileName: 'data',
			};

			getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(mockFormDataAppend).toHaveBeenCalledWith('output_compression', '0');
			expect(result).toHaveLength(1);
		});

		it('should not append optional parameters when not provided', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-2',
					prompt: 'Edit this image',
					binaryPropertyName: 'image_data',
					n: 0,
					size: '',
					quality: '',
					responseFormat: 'url',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/png',
				filename: 'test.png',
			};

			const mockApiResponse = {
				data: [{ url: 'https://example.com/edited-image.png' }],
			};

			getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValue(mockApiResponse);

			await execute.call(mockExecuteFunctions, 0);

			expect(mockFormDataAppend).not.toHaveBeenCalledWith('n', '0');
			expect(mockFormDataAppend).not.toHaveBeenCalledWith('size', '');
			expect(mockFormDataAppend).not.toHaveBeenCalledWith('quality', '');
		});
	});

	describe('FormData handling', () => {
		it('should create FormData with correct headers', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-2',
					prompt: 'Edit this image',
					binaryPropertyName: 'image_data',
					n: 1,
					size: '1024x1024',
					quality: 'standard',
					responseFormat: 'url',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/png',
				filename: 'test.png',
			};

			const mockApiResponse = {
				data: [{ url: 'https://example.com/edited-image.png' }],
			};

			getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValue(mockApiResponse);

			await execute.call(mockExecuteFunctions, 0);
			mockFormDataInstance = lastFormDataInstance.current as Mocked<FormData>;

			expect(mockFormDataGetHeaders).toHaveBeenCalled();
			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/edits', {
				option: { formData: mockFormDataInstance },
				headers: { 'content-type': 'multipart/form-data' },
			});
		});

		it('should filter out empty binary property names for GPT Image 1', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-image-1',
					prompt: 'Edit this image',
					images: {
						values: [
							{ binaryPropertyName: 'image1' },
							{ binaryPropertyName: '' },
							{ binaryPropertyName: 'image2' },
							{ binaryPropertyName: undefined },
							{},
						],
					},
					n: 1,
					size: '1024x1024',
					quality: 'auto',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryFile1 = {
				fileContent: Buffer.from('mock-image-data-1'),
				contentType: 'image/png',
				filename: 'image1.png',
			};

			const mockBinaryFile2 = {
				fileContent: Buffer.from('mock-image-data-2'),
				contentType: 'image/jpeg',
				filename: 'image2.jpg',
			};

			const mockApiResponse = {
				data: [{ b64_json: 'base64encodedimagedata' }],
			};

			const mockBinaryData = {
				data: 'base64encodedimagedata',
				mimeType: 'image/png',
				fileName: 'data',
			};

			getBinaryDataFileSpy
				.mockResolvedValueOnce(mockBinaryFile1)
				.mockResolvedValueOnce(mockBinaryFile2);
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock)
				.mockResolvedValueOnce(mockBinaryFile1.fileContent)
				.mockResolvedValueOnce(mockBinaryFile2.fileContent);
			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

			await execute.call(mockExecuteFunctions, 0);

			expect(getBinaryDataFileSpy).toHaveBeenCalledTimes(2);
			expect(getBinaryDataFileSpy).toHaveBeenNthCalledWith(1, mockExecuteFunctions, 0, 'image1');
			expect(getBinaryDataFileSpy).toHaveBeenNthCalledWith(2, mockExecuteFunctions, 0, 'image2');
		});
	});
});
