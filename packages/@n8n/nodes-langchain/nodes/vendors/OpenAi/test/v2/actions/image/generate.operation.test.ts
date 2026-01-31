import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as transport from '../../../../transport';
import { execute } from '../../../../v2/actions/image/generate.operation';

jest.mock('../../../../transport');

describe('Image Generate Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;
	const apiRequestSpy = jest.spyOn(transport, 'apiRequest');

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'OpenAI Image Generate',
			type: 'n8n-nodes-base.openAi',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		});

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.helpers.prepareBinaryData = jest.fn();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('successful execution with DALL-E 3', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-3',
					prompt: 'A beautiful sunset over mountains',
					options: {
						size: '1024x1024',
						dalleQuality: 'hd',
						style: 'vivid',
						returnImageUrls: true,
					},
				};
				return params[paramName as keyof typeof params];
			});
		});

		it('should generate image with URL response format', async () => {
			const mockApiResponse = {
				data: [
					{
						url: 'https://example.com/generated-image.png',
						revised_prompt: 'A beautiful sunset over mountains with dramatic colors',
					},
				],
			};

			apiRequestSpy.mockResolvedValue(mockApiResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: {
					prompt: 'A beautiful sunset over mountains',
					model: 'dall-e-3',
					response_format: 'url',
					size: '1024x1024',
					quality: 'hd',
					style: 'vivid',
				},
			});

			expect(result).toEqual([
				{
					json: {
						url: 'https://example.com/generated-image.png',
						revised_prompt: 'A beautiful sunset over mountains with dramatic colors',
					},
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should generate image with base64 response format', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-3',
					prompt: 'A cute cat',
					options: {
						size: '1024x1024',
						dalleQuality: 'standard',
						returnImageUrls: false,
						binaryPropertyOutput: 'imageData',
					},
				};
				return params[paramName as keyof typeof params];
			});

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

			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: {
					prompt: 'A cute cat',
					model: 'dall-e-3',
					response_format: 'b64_json',
					size: '1024x1024',
					quality: 'standard',
				},
			});

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
						imageData: mockBinaryData,
					},
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('successful execution with GPT Image 1', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-image-1',
					prompt: 'A futuristic cityscape',
					options: {
						size: '1536x1024',
						quality: 'high',
						binaryPropertyOutput: 'data',
					},
				};
				return params[paramName as keyof typeof params];
			});
		});

		it('should generate image with GPT Image 1 model', async () => {
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

			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: {
					prompt: 'A futuristic cityscape',
					model: 'gpt-image-1',
					response_format: undefined, // gpt-image-1 does not support response_format
					size: '1536x1024',
					quality: 'high',
				},
			});

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

		it('should handle GPT Image 1 with all quality levels', async () => {
			const qualityLevels = ['high', 'medium', 'low'];

			for (const quality of qualityLevels) {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params = {
						model: 'gpt-image-1',
						prompt: 'Test image',
						options: {
							quality,
							binaryPropertyOutput: 'data',
						},
					};
					return params[paramName as keyof typeof params];
				});

				const mockApiResponse = {
					data: [{ b64_json: 'base64data' }],
				};

				const mockBinaryData = {
					data: 'base64data',
					mimeType: 'image/png',
					fileName: 'data',
				};

				apiRequestSpy.mockResolvedValue(mockApiResponse);
				(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
					mockBinaryData,
				);

				await execute.call(mockExecuteFunctions, 0);

				expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
					body: expect.objectContaining({
						model: 'gpt-image-1',
						quality,
					}),
				});

				jest.clearAllMocks();
			}
		});

		it('should handle GPT Image 1 with different resolutions', async () => {
			const resolutions = ['1024x1024', '1024x1536', '1536x1024'];

			for (const size of resolutions) {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params = {
						model: 'gpt-image-1',
						prompt: 'Test image',
						options: {
							size,
							binaryPropertyOutput: 'data',
						},
					};
					return params[paramName as keyof typeof params];
				});

				const mockApiResponse = {
					data: [{ b64_json: 'base64data' }],
				};

				const mockBinaryData = {
					data: 'base64data',
					mimeType: 'image/png',
					fileName: 'data',
				};

				apiRequestSpy.mockResolvedValue(mockApiResponse);
				(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
					mockBinaryData,
				);

				await execute.call(mockExecuteFunctions, 0);

				expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
					body: expect.objectContaining({
						model: 'gpt-image-1',
						size,
					}),
				});

				jest.clearAllMocks();
			}
		});
	});

	describe('successful execution with GPT Image 1.5', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-image-1.5',
					prompt: 'A futuristic cityscape with flying cars',
					options: {
						size: '1536x1024',
						quality: 'high',
						binaryPropertyOutput: 'data',
					},
				};
				return params[paramName as keyof typeof params];
			});
		});

		it('should generate image with GPT Image 1.5 model', async () => {
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

			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: {
					prompt: 'A futuristic cityscape with flying cars',
					model: 'gpt-image-1.5',
					response_format: undefined, // gpt-image-1.5 does not support response_format
					size: '1536x1024',
					quality: 'high',
				},
			});

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

		it('should handle GPT Image 1.5 with all quality levels', async () => {
			const qualityLevels = ['high', 'medium', 'low'];

			for (const quality of qualityLevels) {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params = {
						model: 'gpt-image-1.5',
						prompt: 'Test image',
						options: {
							quality,
							binaryPropertyOutput: 'data',
						},
					};
					return params[paramName as keyof typeof params];
				});

				const mockApiResponse = {
					data: [{ b64_json: 'base64data' }],
				};

				const mockBinaryData = {
					data: 'base64data',
					mimeType: 'image/png',
					fileName: 'data',
				};

				apiRequestSpy.mockResolvedValue(mockApiResponse);
				(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
					mockBinaryData,
				);

				await execute.call(mockExecuteFunctions, 0);

				expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
					body: expect.objectContaining({
						model: 'gpt-image-1.5',
						quality,
					}),
				});

				jest.clearAllMocks();
			}
		});

		it('should handle GPT Image 1.5 with different resolutions', async () => {
			const resolutions = ['1024x1024', '1024x1536', '1536x1024'];

			for (const size of resolutions) {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params = {
						model: 'gpt-image-1.5',
						prompt: 'Test image',
						options: {
							size,
							binaryPropertyOutput: 'data',
						},
					};
					return params[paramName as keyof typeof params];
				});

				const mockApiResponse = {
					data: [{ b64_json: 'base64data' }],
				};

				const mockBinaryData = {
					data: 'base64data',
					mimeType: 'image/png',
					fileName: 'data',
				};

				apiRequestSpy.mockResolvedValue(mockApiResponse);
				(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
					mockBinaryData,
				);

				await execute.call(mockExecuteFunctions, 0);

				expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
					body: expect.objectContaining({
						model: 'gpt-image-1.5',
						size,
					}),
				});

				jest.clearAllMocks();
			}
		});

		it('should not include response_format for GPT Image 1.5', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-image-1.5',
					prompt: 'Test prompt',
					options: {
						returnImageUrls: true, // This should be ignored for gpt-image-1.5
						binaryPropertyOutput: 'data',
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockApiResponse = {
				data: [{ b64_json: 'base64data' }],
			};

			const mockBinaryData = {
				data: 'base64data',
				mimeType: 'image/png',
				fileName: 'data',
			};

			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: expect.objectContaining({
					model: 'gpt-image-1.5',
					response_format: undefined,
				}),
			});
		});
	});

	describe('successful execution with DALL-E 2', () => {
		it('should generate multiple images with DALL-E 2', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-2',
					prompt: 'A simple icon',
					options: {
						n: 3,
						size: '512x512',
						returnImageUrls: true,
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockApiResponse = {
				data: [
					{ url: 'https://example.com/image1.png' },
					{ url: 'https://example.com/image2.png' },
					{ url: 'https://example.com/image3.png' },
				],
			};

			apiRequestSpy.mockResolvedValue(mockApiResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/images/generations', {
				body: {
					prompt: 'A simple icon',
					model: 'dall-e-2',
					response_format: 'url',
					n: 3,
					size: '512x512',
				},
			});

			expect(result).toHaveLength(3);
			expect(result[0].json.url).toBe('https://example.com/image1.png');
			expect(result[1].json.url).toBe('https://example.com/image2.png');
			expect(result[2].json.url).toBe('https://example.com/image3.png');
		});
	});

	describe('parameter validation and edge cases', () => {
		it('should handle empty options', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-3',
					prompt: 'Test prompt',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockApiResponse = {
				data: [{ b64_json: 'base64data' }],
			};

			const mockBinaryData = {
				data: 'base64data',
				mimeType: 'image/png',
				fileName: 'data',
			};

			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result).toHaveLength(1);
		});

		it('should handle multiple images in base64 response', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-2',
					prompt: 'Test prompt',
					options: {
						n: 2,
						returnImageUrls: false,
						binaryPropertyOutput: 'image',
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockApiResponse = {
				data: [{ b64_json: 'base64data1' }, { b64_json: 'base64data2' }],
			};

			const mockBinaryData1 = {
				data: 'base64data1',
				mimeType: 'image/png',
				fileName: 'data',
			};

			const mockBinaryData2 = {
				data: 'base64data2',
				mimeType: 'image/png',
				fileName: 'data',
			};

			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock)
				.mockResolvedValueOnce(mockBinaryData1)
				.mockResolvedValueOnce(mockBinaryData2);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result).toHaveLength(2);
			expect(result[0].binary?.image).toEqual(mockBinaryData1);
			expect(result[1].binary?.image).toEqual(mockBinaryData2);
		});

		it('should use default binaryPropertyOutput when not specified', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'dall-e-3',
					prompt: 'Test prompt',
					options: {
						returnImageUrls: false,
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockApiResponse = {
				data: [{ b64_json: 'base64data' }],
			};

			const mockBinaryData = {
				data: 'base64data',
				mimeType: 'image/png',
				fileName: 'data',
			};

			apiRequestSpy.mockResolvedValue(mockApiResponse);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result[0].binary?.data).toEqual(mockBinaryData);
		});
	});
});
