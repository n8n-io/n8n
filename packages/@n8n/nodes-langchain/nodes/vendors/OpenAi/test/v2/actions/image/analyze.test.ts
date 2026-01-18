import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as binaryDataHelpers from '../../../../helpers/binary-data';
import type { ChatResponse } from '../../../../helpers/interfaces';
import * as transport from '../../../../transport';
import { execute } from '../../../../v2/actions/image/analyze.operation';

jest.mock('../../../../helpers/binary-data');
jest.mock('../../../../transport');

describe('Image Analyze Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;
	const apiRequestSpy = jest.spyOn(transport, 'apiRequest');
	const getBinaryDataFileSpy = jest.spyOn(binaryDataHelpers, 'getBinaryDataFile');

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'OpenAI Image Analyze',
			type: 'n8n-nodes-base.openAi',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		});

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.helpers.binaryToBuffer = jest.fn();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('successful execution with URL input', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o',
					text: "What's in this image?",
					inputType: 'url',
					imageUrls: 'https://example.com/image1.jpg',
					simplify: true,
					options: {},
				};
				return params[paramName as keyof typeof params];
			});
		});

		it('should analyze single image from URL with simplified output', async () => {
			const mockResponse = {
				id: 'response-123',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [
							{
								type: 'output_text',
								text: 'This image shows a beautiful landscape with mountains and a lake.',
							},
						],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: {
					model: 'gpt-4o',
					input: [
						{
							role: 'user',
							content: [
								{
									type: 'input_text',
									text: "What's in this image?",
								},
								{
									type: 'input_image',
									detail: 'auto',
									image_url: 'https://example.com/image1.jpg',
								},
							],
						},
					],
					max_output_tokens: 300,
				},
			});

			expect(result).toEqual([
				{
					json: mockResponse.output,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should analyze multiple images from URLs', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o',
					text: 'Compare these images',
					inputType: 'url',
					imageUrls: 'https://example.com/image1.jpg, https://example.com/image2.png',
					simplify: true,
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockResponse = {
				id: 'response-456',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [
							{
								type: 'output_text',
								text: 'The first image shows a landscape, while the second shows a cityscape.',
							},
						],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: {
					model: 'gpt-4o',
					input: [
						{
							role: 'user',
							content: [
								{
									type: 'input_text',
									text: 'Compare these images',
								},
								{
									type: 'input_image',
									detail: 'auto',
									image_url: 'https://example.com/image1.jpg',
								},
								{
									type: 'input_image',
									detail: 'auto',
									image_url: 'https://example.com/image2.png',
								},
							],
						},
					],
					max_output_tokens: 300,
				},
			});

			expect(result).toHaveLength(1);
		});

		it('should handle URLs with extra whitespace', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o',
					text: 'Analyze these images',
					inputType: 'url',
					imageUrls: ' https://example.com/image1.jpg , https://example.com/image2.png ',
					simplify: true,
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockResponse = {
				id: 'response-789',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Analysis complete.' }],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: expect.objectContaining({
					input: [
						{
							role: 'user',
							content: [
								expect.objectContaining({ type: 'input_text' }),
								expect.objectContaining({
									type: 'input_image',
									image_url: 'https://example.com/image1.jpg',
								}),
								expect.objectContaining({
									type: 'input_image',
									image_url: 'https://example.com/image2.png',
								}),
							],
						},
					],
				}),
			});
		});

		it('should use custom options for URL analysis', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o-mini',
					text: 'Describe this image in detail',
					inputType: 'url',
					imageUrls: 'https://example.com/detailed-image.jpg',
					simplify: false,
					options: {
						detail: 'high',
						maxTokens: 500,
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockResponse = {
				id: 'response-detailed',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Detailed analysis...' }],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: {
					model: 'gpt-4o-mini',
					input: [
						{
							role: 'user',
							content: [
								{
									type: 'input_text',
									text: 'Describe this image in detail',
								},
								{
									type: 'input_image',
									detail: 'high',
									image_url: 'https://example.com/detailed-image.jpg',
								},
							],
						},
					],
					max_output_tokens: 500,
				},
			});

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('successful execution with binary input', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o',
					text: 'Analyze this image',
					inputType: 'base64',
					binaryPropertyName: 'image_data',
					simplify: true,
					options: {},
				};
				return params[paramName as keyof typeof params];
			});
		});

		it('should analyze single binary image', async () => {
			const mockBinaryFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/jpeg',
				filename: 'test.jpg',
			};

			const mockResponse = {
				id: 'response-binary',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'This is a JPEG image showing...' }],
					},
				],
			} as ChatResponse;

			getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as jest.Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValue(mockResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(getBinaryDataFileSpy).toHaveBeenCalledWith(mockExecuteFunctions, 0, 'image_data');
			expect(mockExecuteFunctions.helpers.binaryToBuffer).toHaveBeenCalledWith(
				mockBinaryFile.fileContent,
			);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: {
					model: 'gpt-4o',
					input: [
						{
							role: 'user',
							content: [
								{
									type: 'input_text',
									text: 'Analyze this image',
								},
								{
									type: 'input_image',
									detail: 'auto',
									image_url: `data:image/jpeg;base64,${mockBinaryFile.fileContent.toString('base64')}`,
								},
							],
						},
					],
					max_output_tokens: 300,
				},
			});

			expect(result).toEqual([
				{
					json: mockResponse.output,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should analyze multiple binary images', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o',
					text: 'Compare these images',
					inputType: 'base64',
					binaryPropertyName: 'image1, image2',
					simplify: true,
					options: { detail: 'low' },
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
				contentType: 'image/gif',
				filename: 'image2.gif',
			};

			const mockResponse = {
				id: 'response-multi-binary',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Comparison of the two images...' }],
					},
				],
			} as ChatResponse;

			getBinaryDataFileSpy
				.mockResolvedValueOnce(mockBinaryFile1)
				.mockResolvedValueOnce(mockBinaryFile2);
			(mockExecuteFunctions.helpers.binaryToBuffer as jest.Mock)
				.mockResolvedValueOnce(mockBinaryFile1.fileContent)
				.mockResolvedValueOnce(mockBinaryFile2.fileContent);
			apiRequestSpy.mockResolvedValue(mockResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(getBinaryDataFileSpy).toHaveBeenCalledTimes(2);
			expect(getBinaryDataFileSpy).toHaveBeenNthCalledWith(1, mockExecuteFunctions, 0, 'image1');
			expect(getBinaryDataFileSpy).toHaveBeenNthCalledWith(2, mockExecuteFunctions, 0, 'image2');

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: {
					model: 'gpt-4o',
					input: [
						{
							role: 'user',
							content: [
								{
									type: 'input_text',
									text: 'Compare these images',
								},
								{
									type: 'input_image',
									detail: 'low',
									image_url: `data:image/png;base64,${mockBinaryFile1.fileContent.toString('base64')}`,
								},
								{
									type: 'input_image',
									detail: 'low',
									image_url: `data:image/gif;base64,${mockBinaryFile2.fileContent.toString('base64')}`,
								},
							],
						},
					],
					max_output_tokens: 300,
				},
			});

			expect(result).toHaveLength(1);
		});

		it('should handle binary property names with whitespace', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o',
					text: 'Analyze images',
					inputType: 'base64',
					binaryPropertyName: ' image1 , image2 ',
					simplify: true,
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

			const mockResponse = {
				id: 'response-whitespace',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Analysis complete.' }],
					},
				],
			} as ChatResponse;

			getBinaryDataFileSpy
				.mockResolvedValueOnce(mockBinaryFile1)
				.mockResolvedValueOnce(mockBinaryFile2);
			(mockExecuteFunctions.helpers.binaryToBuffer as jest.Mock)
				.mockResolvedValueOnce(mockBinaryFile1.fileContent)
				.mockResolvedValueOnce(mockBinaryFile2.fileContent);
			apiRequestSpy.mockResolvedValue(mockResponse);

			await execute.call(mockExecuteFunctions, 0);

			expect(getBinaryDataFileSpy).toHaveBeenNthCalledWith(1, mockExecuteFunctions, 0, 'image1');
			expect(getBinaryDataFileSpy).toHaveBeenNthCalledWith(2, mockExecuteFunctions, 0, 'image2');
		});
	});

	describe('parameter validation and edge cases', () => {
		it('should use default model when not specified', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index: number, defaultValue?: any) => {
					const params: Record<string, any> = {
						text: 'Analyze this image',
						inputType: 'url',
						imageUrls: 'https://example.com/image.jpg',
						simplify: true,
						options: {},
					};

					if (paramName === 'modelId') {
						return defaultValue; // Should return 'gpt-4o' as default
					}

					return params[paramName];
				},
			);

			const mockResponse = {
				id: 'response-default-model',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Analysis with default model.' }],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: expect.objectContaining({
					model: 'gpt-4o',
				}),
			});
		});

		it('should use default text when not specified', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, _index: number, defaultValue?: any) => {
					const params: Record<string, any> = {
						modelId: 'gpt-4o',
						inputType: 'url',
						imageUrls: 'https://example.com/image.jpg',
						simplify: true,
						options: {},
					};

					if (paramName === 'text') {
						return defaultValue; // Should return empty string as default
					}

					return params[paramName];
				},
			);

			const mockResponse = {
				id: 'response-default-text',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Analysis with default text.' }],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: expect.objectContaining({
					input: [
						{
							role: 'user',
							content: [
								{
									type: 'input_text',
									text: '',
								},
								expect.any(Object),
							],
						},
					],
				}),
			});
		});

		it('should use default maxTokens when not specified in options', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o',
					text: 'Analyze this image',
					inputType: 'url',
					imageUrls: 'https://example.com/image.jpg',
					simplify: true,
					options: {}, // No maxTokens specified
				};
				return params[paramName as keyof typeof params];
			});

			const mockResponse = {
				id: 'response-default-tokens',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Analysis with default token limit.' }],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: expect.objectContaining({
					max_output_tokens: 300,
				}),
			});
		});

		it('should use default detail level when not specified in options', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o',
					text: 'Analyze this image',
					inputType: 'url',
					imageUrls: 'https://example.com/image.jpg',
					simplify: true,
					options: {}, // No detail specified
				};
				return params[paramName as keyof typeof params];
			});

			const mockResponse = {
				id: 'response-default-detail',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Analysis with default detail level.' }],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: expect.objectContaining({
					input: [
						{
							role: 'user',
							content: [
								expect.any(Object),
								expect.objectContaining({
									type: 'input_image',
									detail: 'auto',
								}),
							],
						},
					],
				}),
			});
		});

		it('should handle mixed empty and valid URLs', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o',
					text: 'Analyze these images',
					inputType: 'url',
					imageUrls: 'https://example.com/image1.jpg, , https://example.com/image2.png',
					simplify: true,
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockResponse = {
				id: 'response-mixed-urls',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Analysis of valid images.' }],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: expect.objectContaining({
					input: [
						{
							role: 'user',
							content: [
								expect.any(Object),
								expect.objectContaining({
									image_url: 'https://example.com/image1.jpg',
								}),
								expect.objectContaining({
									image_url: '',
								}),
								expect.objectContaining({
									image_url: 'https://example.com/image2.png',
								}),
							],
						},
					],
				}),
			});
		});
	});

	describe('output formatting', () => {
		it('should return simplified output when simplify is true', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o',
					text: 'Analyze this image',
					inputType: 'url',
					imageUrls: 'https://example.com/image.jpg',
					simplify: true,
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockResponse = {
				id: 'response-simplified',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'This is the analysis result.' }],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result).toEqual([
				{
					json: mockResponse.output,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should return full response when simplify is false', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o',
					text: 'Analyze this image',
					inputType: 'url',
					imageUrls: 'https://example.com/image.jpg',
					simplify: false,
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockResponse = {
				id: 'response-full',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'This is the analysis result.' }],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result).toEqual([
				{
					json: mockResponse,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('options handling', () => {
		it('should apply all available options correctly', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o-mini',
					text: 'Provide detailed analysis',
					inputType: 'url',
					imageUrls: 'https://example.com/complex-image.jpg',
					simplify: false,
					options: {
						detail: 'high',
						maxTokens: 1000,
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockResponse = {
				id: 'response-options',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Detailed analysis...' }],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: {
					model: 'gpt-4o-mini',
					input: [
						{
							role: 'user',
							content: [
								{
									type: 'input_text',
									text: 'Provide detailed analysis',
								},
								{
									type: 'input_image',
									detail: 'high',
									image_url: 'https://example.com/complex-image.jpg',
								},
							],
						},
					],
					max_output_tokens: 1000,
				},
			});
		});

		it('should handle partial options correctly', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'gpt-4o',
					text: 'Quick analysis',
					inputType: 'url',
					imageUrls: 'https://example.com/image.jpg',
					simplify: true,
					options: {
						detail: 'low',
						// maxTokens not specified, should use default
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockResponse = {
				id: 'response-partial-options',
				status: 'completed',
				output: [
					{
						type: 'message',
						role: 'assistant',
						content: [{ type: 'output_text', text: 'Quick analysis result.' }],
					},
				],
			} as ChatResponse;

			apiRequestSpy.mockResolvedValue(mockResponse);

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/responses', {
				body: expect.objectContaining({
					max_output_tokens: 300, // Default value
					input: [
						{
							role: 'user',
							content: [
								expect.any(Object),
								expect.objectContaining({
									detail: 'low',
								}),
							],
						},
					],
				}),
			});
		});
	});
});
