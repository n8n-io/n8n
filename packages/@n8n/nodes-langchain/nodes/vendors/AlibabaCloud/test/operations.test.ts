import type { IExecuteFunctions, IBinaryData } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

vi.mock('../transport', () => ({
	apiRequest: vi.fn(),
	pollTaskResult: vi.fn(),
}));

vi.mock('@utils/helpers', () => ({
	getConnectedTools: vi.fn().mockResolvedValue([]),
}));

vi.mock('zod-to-json-schema', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('n8n-workflow', async () => {
	const actual = await vi.importActual('n8n-workflow');
	return {
		...actual,
		accumulateTokenUsage: vi.fn(),
	};
});

import { execute as imageAnalyzeExecute } from '../actions/image/analyze.operation';
import { execute as imageGenerateExecute } from '../actions/image/generate.operation';
import { execute as textMessageExecute } from '../actions/text/message.operation';
import { execute as videoI2VExecute } from '../actions/video/generate.i2v.operation';
import { execute as videoT2VExecute } from '../actions/video/generate.t2v.operation';
import { apiRequest, pollTaskResult } from '../transport';

import type { Mock } from 'vitest';

const mockApiRequest = apiRequest as Mock;
const mockPollTaskResult = pollTaskResult as Mock;

describe('AlicloudModelStudio Operations', () => {
	let mockExecuteFunctions: ReturnType<typeof mock<IExecuteFunctions>>;

	let mockNode: { typeVersion: number };

	beforeEach(() => {
		mockNode = { typeVersion: 1 };
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue(mockNode as any);
		mockExecuteFunctions.getNodeInputs.mockReturnValue([{ type: 'main' }]);
		mockExecuteFunctions.getExecutionCancelSignal.mockReturnValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Text: message (v1.1 RLC)', () => {
		it('should extract model value from RLC parameter with extractValue', async () => {
			mockNode.typeVersion = 1.1;
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any, options?: any) => {
					if (param === 'modelId' && options?.extractValue) {
						return 'qwen3.5-flash';
					}
					const params: Record<string, unknown> = {
						messages: {
							messageValues: [{ role: 'user', content: 'Hello from v1.1' }],
						},
						options: {},
						simplify: true,
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				output: {
					choices: [{ message: { content: [{ text: 'Hi from v1.1!' }] } }],
				},
				usage: { input_tokens: 5, output_tokens: 3 },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await textMessageExecute.call(mockExecuteFunctions, 0);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('modelId', 0, '', {
				extractValue: true,
			});
			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/multimodal-generation/generation',
				expect.objectContaining({
					body: expect.objectContaining({ model: 'qwen3.5-flash' }),
				}),
			);
			expect(result.json).toEqual({ content: 'Hi from v1.1!' });
		});
	});

	describe('Text: message', () => {
		it('should send correct request body to text-generation endpoint for text-only model', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'qwen-coder-turbo',
						messages: { messageValues: [{ role: 'user', content: 'Hello' }] },
						options: {},
						simplify: true,
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				output: { text: 'Hi there!' },
				usage: { input_tokens: 5, output_tokens: 3 },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await textMessageExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/text-generation/generation',
				{
					body: expect.objectContaining({
						model: 'qwen-coder-turbo',
						input: {
							messages: [{ role: 'user', content: 'Hello' }],
						},
					}),
				},
			);
			expect(result.json).toEqual({ content: 'Hi there!' });
		});

		it('should use multimodal endpoint and convert string content to array format for multimodal models', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'qwen3.5-flash',
						messages: {
							messageValues: [{ role: 'user', content: 'What is 2+2?' }],
						},
						options: { system: 'You are helpful' },
						simplify: true,
						'options.maxToolsIterations': 15,
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				output: {
					choices: [{ message: { content: [{ text: '4' }] } }],
				},
				usage: { input_tokens: 10, output_tokens: 1 },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await textMessageExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/multimodal-generation/generation',
				{
					body: expect.objectContaining({
						model: 'qwen3.5-flash',
						input: {
							messages: [
								{ role: 'system', content: [{ text: 'You are helpful' }] },
								{ role: 'user', content: [{ text: 'What is 2+2?' }] },
							],
						},
					}),
				},
			);
			expect(result.json).toEqual({ content: '4' });
		});

		it('should return full response object when simplify is false', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'qwen-coder-turbo',
						messages: { messageValues: [{ role: 'user', content: 'Hello' }] },
						options: {},
						simplify: false,
						'options.maxToolsIterations': 15,
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				output: { text: 'Hi there!' },
				usage: { input_tokens: 5, output_tokens: 3 },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await textMessageExecute.call(mockExecuteFunctions, 0);

			expect(result.json).toEqual({
				content: 'Hi there!',
				model: 'qwen-coder-turbo',
				usage: { input_tokens: 5, output_tokens: 3 },
				fullResponse: mockResponse,
			});
		});
	});

	describe('Image: analyze (v1.1 RLC)', () => {
		it('should extract model value from RLC parameter with extractValue', async () => {
			mockNode.typeVersion = 1.1;
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any, options?: any) => {
					if (param === 'modelId' && options?.extractValue) {
						return 'qwen3-vl-flash';
					}
					const params: Record<string, unknown> = {
						inputType: 'url',
						imageUrl: 'https://example.com/photo.jpg',
						question: 'Describe this',
						visionOptions: {},
						simplify: true,
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({
				output: {
					choices: [{ message: { content: [{ text: 'A photo' }] } }],
				},
				usage: { input_tokens: 10, output_tokens: 2 },
			});

			const result = await imageAnalyzeExecute.call(mockExecuteFunctions, 0);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('modelId', 0, '', {
				extractValue: true,
			});
			expect(result.json).toEqual({ content: 'A photo' });
		});
	});

	describe('Image: analyze', () => {
		it('should send image URL and question to multimodal endpoint and return text response', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'qwen3-vl-flash',
						inputType: 'url',
						imageUrl: 'https://example.com/photo.jpg',
						question: 'What is in this image?',
						visionOptions: {},
						simplify: true,
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				output: {
					choices: [{ message: { content: [{ text: 'A cat on a sofa' }] } }],
				},
				usage: { input_tokens: 100, output_tokens: 5 },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await imageAnalyzeExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/multimodal-generation/generation',
				{
					body: expect.objectContaining({
						model: 'qwen3-vl-flash',
						input: {
							messages: [
								{
									role: 'user',
									content: [
										{ image: 'https://example.com/photo.jpg' },
										{ text: 'What is in this image?' },
									],
								},
							],
						},
					}),
				},
			);
			expect(result.json).toEqual({ content: 'A cat on a sofa' });
		});
	});

	describe('Image: generate (v1.1 RLC)', () => {
		it('should extract model value from RLC parameter with extractValue', async () => {
			mockNode.typeVersion = 1.1;
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any, options?: any) => {
					if (param === 'modelId' && options?.extractValue) {
						return 'z-image-turbo';
					}
					const params: Record<string, unknown> = {
						prompt: 'A mountain landscape',
						imageOptions: {},
						downloadImage: false,
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({
				output: {
					choices: [{ message: { content: [{ image: 'https://result.aliyuncs.com/gen.png' }] } }],
				},
				usage: { input_tokens: 10 },
			});

			const result = await imageGenerateExecute.call(mockExecuteFunctions, 0);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('modelId', 0, '', {
				extractValue: true,
			});
			expect(result.json).toEqual({
				model: 'z-image-turbo',
				imageUrl: 'https://result.aliyuncs.com/gen.png',
				usage: { input_tokens: 10 },
			});
		});
	});

	describe('Image: generate', () => {
		it('should send prompt and return URL-only when downloadImage is false', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'z-image-turbo',
						prompt: 'A sunset over mountains',
						imageOptions: {},
						downloadImage: false,
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				output: {
					choices: [
						{
							message: {
								content: [{ image: 'https://result.aliyuncs.com/generated.png' }],
							},
						},
					],
				},
				usage: { input_tokens: 10 },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await imageGenerateExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/multimodal-generation/generation',
				{
					body: expect.objectContaining({
						model: 'z-image-turbo',
						parameters: expect.objectContaining({ prompt_extend: false }),
					}),
				},
			);
			expect(result.json).toEqual({
				model: 'z-image-turbo',
				imageUrl: 'https://result.aliyuncs.com/generated.png',
				usage: { input_tokens: 10 },
			});
			expect(result.binary).toBeUndefined();
			expect(mockPollTaskResult).not.toHaveBeenCalled();
		});

		it('should auto-download image as binary when downloadImage is true', async () => {
			const deepMock = mockDeep<IExecuteFunctions>();
			deepMock.getNode.mockReturnValue({ typeVersion: 1 } as any);
			deepMock.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'z-image-turbo',
						prompt: 'A sunset over mountains',
						imageOptions: {},
						downloadImage: true,
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				output: {
					choices: [
						{
							message: {
								content: [{ image: 'https://result.aliyuncs.com/generated.png' }],
							},
						},
					],
				},
				usage: { input_tokens: 10 },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const imageBuffer = Buffer.from('fake-png-data');
			deepMock.helpers.httpRequest.mockResolvedValue({
				body: imageBuffer,
				headers: { 'content-type': 'image/png' },
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'image/png',
				fileType: 'image',
				fileExtension: 'png',
				data: '',
				fileName: 'image.png',
			};
			deepMock.helpers.prepareBinaryData.mockResolvedValue(mockBinaryData);

			const result = await imageGenerateExecute.call(deepMock, 0);

			expect(deepMock.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: 'https://result.aliyuncs.com/generated.png',
					encoding: 'arraybuffer',
					returnFullResponse: true,
				}),
			);
			expect(result.binary).toBeDefined();
			expect(result.binary!.data).toEqual(mockBinaryData);
			expect(result.json).toEqual(
				expect.objectContaining({
					model: 'z-image-turbo',
					imageUrl: 'https://result.aliyuncs.com/generated.png',
				}),
			);
		});

		it('should use async image-generation and poll for wan2.6-t2i with default size and n=1', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'wan2.6-t2i',
						prompt: 'A flower shop with wooden door',
						imageOptions: {},
						downloadImage: false,
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({
				output: { task_id: 'wan-t2i-task-1', task_status: 'PENDING' },
			});
			mockPollTaskResult.mockResolvedValue({
				output: {
					task_status: 'SUCCEEDED',
					choices: [
						{
							message: {
								content: [{ image: 'https://result.aliyuncs.com/wan-t2i.png', type: 'image' }],
							},
						},
					],
				},
				usage: { image_count: 1, size: '1280*1280' },
			});

			const result = await imageGenerateExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/image-generation/generation',
				expect.objectContaining({
					headers: { 'X-DashScope-Async': 'enable' },
					body: expect.objectContaining({
						model: 'wan2.6-t2i',
						parameters: expect.objectContaining({
							n: 1,
							size: '1280*1280',
							prompt_extend: false,
						}),
					}),
				}),
			);
			expect(mockPollTaskResult).toHaveBeenCalledWith('wan-t2i-task-1');
			expect(result.json).toEqual({
				model: 'wan2.6-t2i',
				imageUrl: 'https://result.aliyuncs.com/wan-t2i.png',
				usage: { image_count: 1, size: '1280*1280' },
			});
		});

		it('should download reference image URLs and send them as data URIs for wan2.6-image', async () => {
			const deepMock = mockDeep<IExecuteFunctions>();
			deepMock.getNode.mockReturnValue({ typeVersion: 1 } as any);
			deepMock.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'wan2.6-image',
						prompt: 'Edit this scene',
						referenceImages: {
							values: [{ inputType: 'url', imageUrl: 'https://example.com/ref.jpg' }],
						},
						imageOptions: {},
						downloadImage: false,
					};
					return params[param] ?? fallback;
				},
			);
			deepMock.helpers.httpRequest.mockResolvedValue({
				body: Buffer.from('fake-jpg-data'),
				headers: { 'content-type': 'image/jpeg' },
			});

			mockApiRequest.mockResolvedValue({
				output: { task_id: 'wan-image-task-1', task_status: 'PENDING' },
			});
			mockPollTaskResult.mockResolvedValue({
				output: {
					task_status: 'SUCCEEDED',
					choices: [
						{
							message: {
								content: [
									{ text: 'Here is the edited image' },
									{ image: 'https://result.aliyuncs.com/wan-image.png', type: 'image' },
								],
							},
						},
					],
				},
				usage: { image_count: 1 },
			});

			const result = await imageGenerateExecute.call(deepMock, 0);

			expect(deepMock.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: 'https://example.com/ref.jpg',
					encoding: 'arraybuffer',
					returnFullResponse: true,
				}),
			);
			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/image-generation/generation',
				expect.objectContaining({
					headers: { 'X-DashScope-Async': 'enable' },
					body: expect.objectContaining({
						model: 'wan2.6-image',
						input: {
							messages: [
								{
									role: 'user',
									content: [
										{ text: 'Edit this scene' },
										{
											image: `data:image/jpeg;base64,${Buffer.from('fake-jpg-data').toString('base64')}`,
										},
									],
								},
							],
						},
						parameters: expect.objectContaining({
							n: 1,
							size: '1280*1280',
						}),
					}),
				}),
			);
			expect(mockPollTaskResult).toHaveBeenCalledWith('wan-image-task-1');
			expect(result.json).toEqual({
				model: 'wan2.6-image',
				imageUrl: 'https://result.aliyuncs.com/wan-image.png',
				usage: { image_count: 1 },
			});
		});

		it('should use old text2image synthesis and input.prompt for wan2.5-t2i-preview', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'wan2.5-t2i-preview',
						prompt: 'A sitting orange cat',
						imageOptions: {},
						downloadImage: false,
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({
				output: { task_id: 'wan-old-t2i-1', task_status: 'PENDING' },
			});
			mockPollTaskResult.mockResolvedValue({
				output: {
					task_status: 'SUCCEEDED',
					results: [{ url: 'https://result.aliyuncs.com/wan-old-t2i.png' }],
				},
				usage: { image_count: 1 },
			});

			const result = await imageGenerateExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/text2image/image-synthesis',
				expect.objectContaining({
					headers: { 'X-DashScope-Async': 'enable' },
					body: {
						model: 'wan2.5-t2i-preview',
						input: { prompt: 'A sitting orange cat' },
						parameters: {
							prompt_extend: false,
							n: 1,
							size: '1280*1280',
						},
					},
				}),
			);
			expect(mockPollTaskResult).toHaveBeenCalledWith('wan-old-t2i-1');
			expect(result.json).toEqual({
				model: 'wan2.5-t2i-preview',
				imageUrl: 'https://result.aliyuncs.com/wan-old-t2i.png',
				usage: { image_count: 1 },
			});
		});

		it('should default wan2.2-t2i-flash size to 1024*1024 on the old t2i endpoint', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'wan2.2-t2i-flash',
						prompt: 'A flower shop',
						imageOptions: {},
						downloadImage: false,
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({
				output: { task_id: 'wan-22-1', task_status: 'PENDING' },
			});
			mockPollTaskResult.mockResolvedValue({
				output: {
					task_status: 'SUCCEEDED',
					results: [{ url: 'https://result.aliyuncs.com/wan-22.png' }],
				},
			});

			await imageGenerateExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/text2image/image-synthesis',
				expect.objectContaining({
					body: expect.objectContaining({
						model: 'wan2.2-t2i-flash',
						input: { prompt: 'A flower shop' },
						parameters: expect.objectContaining({ size: '1024*1024', n: 1 }),
					}),
				}),
			);
		});

		it('should route wanx2.1-t2i-plus to the old t2i endpoint', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'wanx2.1-t2i-plus',
						prompt: 'A mountain landscape',
						imageOptions: {},
						downloadImage: false,
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({
				output: { task_id: 'wanx-21-1', task_status: 'PENDING' },
			});
			mockPollTaskResult.mockResolvedValue({
				output: {
					task_status: 'SUCCEEDED',
					results: [{ url: 'https://result.aliyuncs.com/wanx.png' }],
				},
			});

			await imageGenerateExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/text2image/image-synthesis',
				expect.objectContaining({
					body: expect.objectContaining({ model: 'wanx2.1-t2i-plus' }),
				}),
			);
		});

		it('should use old image2image synthesis and input.images for wan2.5-i2i-preview', async () => {
			const deepMock = mockDeep<IExecuteFunctions>();
			deepMock.getNode.mockReturnValue({ typeVersion: 1 } as any);
			deepMock.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'wan2.5-i2i-preview',
						prompt: 'Make it sunset',
						referenceImages: {
							values: [{ inputType: 'url', imageUrl: 'https://example.com/ref.jpg' }],
						},
						imageOptions: {},
						downloadImage: false,
					};
					return params[param] ?? fallback;
				},
			);
			deepMock.helpers.httpRequest.mockResolvedValue({
				body: Buffer.from('fake-jpg-data'),
				headers: { 'content-type': 'image/jpeg' },
			});

			mockApiRequest.mockResolvedValue({
				output: { task_id: 'wan-i2i-1', task_status: 'PENDING' },
			});
			mockPollTaskResult.mockResolvedValue({
				output: {
					task_status: 'SUCCEEDED',
					results: [{ url: 'https://result.aliyuncs.com/wan-i2i.png' }],
				},
			});

			const result = await imageGenerateExecute.call(deepMock, 0);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/image2image/image-synthesis',
				expect.objectContaining({
					headers: { 'X-DashScope-Async': 'enable' },
					body: {
						model: 'wan2.5-i2i-preview',
						input: {
							prompt: 'Make it sunset',
							images: [`data:image/jpeg;base64,${Buffer.from('fake-jpg-data').toString('base64')}`],
						},
						parameters: {
							prompt_extend: false,
							n: 1,
							size: '1280*1280',
						},
					},
				}),
			);
			expect(result.json.imageUrl).toBe('https://result.aliyuncs.com/wan-i2i.png');
		});

		it('should keep wan2.7-image on the new async endpoint without requiring refs', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'wan2.7-image',
						prompt: 'A flower shop',
						imageOptions: {},
						downloadImage: false,
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({
				output: { task_id: 'wan-27-1', task_status: 'PENDING' },
			});
			mockPollTaskResult.mockResolvedValue({
				output: {
					task_status: 'SUCCEEDED',
					choices: [
						{
							message: {
								content: [{ image: 'https://result.aliyuncs.com/wan-27.png', type: 'image' }],
							},
						},
					],
				},
			});

			await imageGenerateExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/image-generation/generation',
				expect.objectContaining({
					body: expect.objectContaining({
						model: 'wan2.7-image',
						input: {
							messages: [{ role: 'user', content: [{ text: 'A flower shop' }] }],
						},
					}),
				}),
			);
			expect(mockPollTaskResult).toHaveBeenCalledWith('wan-27-1');
		});

		it('should fail before create when wan2.6-image has no reference images', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'wan2.6-image',
						prompt: 'a cat on a tree',
						imageOptions: {},
						downloadImage: false,
					};
					return params[param] ?? fallback;
				},
			);

			await expect(imageGenerateExecute.call(mockExecuteFunctions, 0)).rejects.toThrow(
				'This Wan image-edit model needs 1 to 4 reference images. Use a Wan t2i model for text-only generate.',
			);
			expect(mockApiRequest).not.toHaveBeenCalled();
			expect(mockPollTaskResult).not.toHaveBeenCalled();
		});
	});

	describe('Video: textToVideo (v1.1 RLC)', () => {
		it('should extract model value from RLC parameter with extractValue', async () => {
			mockNode.typeVersion = 1.1;
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any, options?: any) => {
					if (param === 'modelId' && options?.extractValue) {
						return 'wan2.6-t2v';
					}
					const params: Record<string, unknown> = {
						prompt: 'A sunset timelapse',
						resolution: '720P',
						duration: 3,
						shotType: 'single',
						simplify: true,
						downloadVideo: false,
						videoOptions: {},
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({ output: { task_id: 't2v-rlc-1' } });
			mockPollTaskResult.mockResolvedValue({
				output: { task_status: 'SUCCEEDED', video_url: 'https://result.aliyuncs.com/t2v.mp4' },
				usage: { input_tokens: 20 },
			});

			const result = await videoT2VExecute.call(mockExecuteFunctions, 0);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('modelId', 0, '', {
				extractValue: true,
			});
			expect(result.json).toEqual({
				videoUrl: 'https://result.aliyuncs.com/t2v.mp4',
			});
		});
	});

	describe('Video: textToVideo', () => {
		it('should create async task, poll until SUCCEEDED, and return video URL with metadata', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'wan2.6-t2v',
						prompt: 'A cat playing with yarn',
						resolution: '1080P',
						duration: 5,
						shotType: 'single',
						simplify: false,
						downloadVideo: false,
						videoOptions: {},
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({
				output: { task_id: 'video-task-1' },
			});

			mockPollTaskResult.mockResolvedValue({
				output: {
					task_status: 'SUCCEEDED',
					video_url: 'https://result.aliyuncs.com/video.mp4',
					submit_time: '2026-01-01T00:00:00Z',
					end_time: '2026-01-01T00:01:00Z',
				},
				usage: { input_tokens: 50 },
			});

			const result = await videoT2VExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/video-generation/video-synthesis',
				expect.objectContaining({
					headers: { 'X-DashScope-Async': 'enable' },
					body: expect.objectContaining({
						model: 'wan2.6-t2v',
						input: { prompt: 'A cat playing with yarn' },
						parameters: expect.objectContaining({
							resolution: '1080P',
							duration: 5,
							shot_type: 'single',
						}),
					}),
				}),
			);
			expect(mockPollTaskResult).toHaveBeenCalledWith('video-task-1');
			expect(result.json).toEqual(
				expect.objectContaining({
					model: 'wan2.6-t2v',
					taskId: 'video-task-1',
					videoUrl: 'https://result.aliyuncs.com/video.mp4',
				}),
			);
		});
	});

	describe('Video: imageToVideo (v1.1 RLC)', () => {
		it('should extract model value from RLC parameter with extractValue', async () => {
			mockNode.typeVersion = 1.1;
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any, options?: any) => {
					if (param === 'modelId' && options?.extractValue) {
						return 'wan2.6-i2v-flash';
					}
					const params: Record<string, unknown> = {
						inputType: 'url',
						imgUrl: 'https://example.com/frame.png',
						prompt: 'A flower blooming',
						resolution: '720P',
						duration: 3,
						shotType: 'single',
						simplify: true,
						downloadVideo: false,
						imageToVideoOptions: {},
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({ output: { task_id: 'i2v-rlc-1' } });
			mockPollTaskResult.mockResolvedValue({
				output: { task_status: 'SUCCEEDED', video_url: 'https://result.aliyuncs.com/i2v.mp4' },
				usage: { input_tokens: 30 },
			});

			const result = await videoI2VExecute.call(mockExecuteFunctions, 0);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('modelId', 0, '', {
				extractValue: true,
			});
			expect(result.json).toEqual({
				videoUrl: 'https://result.aliyuncs.com/i2v.mp4',
			});
		});
	});

	describe('Video: imageToVideo', () => {
		it('should create async task with image URL input, poll until SUCCEEDED, and return video URL', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'wan2.6-i2v-flash',
						inputType: 'url',
						imgUrl: 'https://example.com/first-frame.png',
						prompt: 'A bird taking flight',
						resolution: '720P',
						duration: 3,
						shotType: 'single',
						simplify: true,
						downloadVideo: false,
						imageToVideoOptions: {},
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({
				output: { task_id: 'i2v-task-1' },
			});

			mockPollTaskResult.mockResolvedValue({
				output: {
					task_status: 'SUCCEEDED',
					video_url: 'https://result.aliyuncs.com/i2v-video.mp4',
				},
				usage: { input_tokens: 40 },
			});

			const result = await videoI2VExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'POST',
				'/api/v1/services/aigc/video-generation/video-synthesis',
				expect.objectContaining({
					body: expect.objectContaining({
						model: 'wan2.6-i2v-flash',
						input: expect.objectContaining({
							img_url: 'https://example.com/first-frame.png',
							prompt: 'A bird taking flight',
						}),
					}),
				}),
			);
			expect(result.json).toEqual({
				videoUrl: 'https://result.aliyuncs.com/i2v-video.mp4',
			});
		});
	});
});
