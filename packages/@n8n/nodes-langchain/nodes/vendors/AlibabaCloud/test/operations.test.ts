import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, IBinaryData } from 'n8n-workflow';

jest.mock('../transport', () => ({
	apiRequest: jest.fn(),
	pollTaskResult: jest.fn(),
}));

jest.mock('@utils/helpers', () => ({
	getConnectedTools: jest.fn().mockResolvedValue([]),
}));

jest.mock('zod-to-json-schema', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('n8n-workflow', () => {
	const actual = jest.requireActual('n8n-workflow');
	return {
		...actual,
		accumulateTokenUsage: jest.fn(),
	};
});

import { execute as textMessageExecute } from '../actions/text/message.operation';
import { execute as imageAnalyzeExecute } from '../actions/image/analyze.operation';
import { execute as imageGenerateExecute } from '../actions/image/generate.operation';
import { execute as videoT2VExecute } from '../actions/video/generate.t2v.operation';
import { execute as videoI2VExecute } from '../actions/video/generate.i2v.operation';
import { apiRequest, pollTaskResult } from '../transport';

const mockApiRequest = apiRequest as jest.Mock;
const mockPollTaskResult = pollTaskResult as jest.Mock;

describe('AlicloudModelStudio Operations', () => {
	let mockExecuteFunctions: ReturnType<typeof mock<IExecuteFunctions>>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.getNodeInputs.mockReturnValue([{ type: 'main' }]);
		mockExecuteFunctions.getExecutionCancelSignal.mockReturnValue(undefined);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Text: message', () => {
		it('should send correct request body to text-generation endpoint for non-multimodal model', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'some-text-only-model',
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
						model: 'some-text-only-model',
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
						modelId: 'some-text-only-model',
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
				model: 'some-text-only-model',
				usage: { input_tokens: 5, output_tokens: 3 },
				fullResponse: mockResponse,
			});
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
		});

		it('should auto-download image as binary when downloadImage is true', async () => {
			const deepMock = mockDeep<IExecuteFunctions>();
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
