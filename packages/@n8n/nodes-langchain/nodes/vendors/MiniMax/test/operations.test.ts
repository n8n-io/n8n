import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, IBinaryData } from 'n8n-workflow';

jest.mock('../transport', () => ({
	apiRequest: jest.fn(),
	pollVideoTask: jest.fn(),
	getVideoDownloadUrl: jest.fn(),
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
import { execute as imageGenerateExecute } from '../actions/image/generate.operation';
import { execute as videoT2VExecute } from '../actions/video/generate.t2v.operation';
import { execute as videoI2VExecute } from '../actions/video/generate.i2v.operation';
import { execute as audioTTSExecute } from '../actions/audio/tts.operation';
import { apiRequest, pollVideoTask, getVideoDownloadUrl } from '../transport';

const mockApiRequest = apiRequest as jest.Mock;
const mockPollVideoTask = pollVideoTask as jest.Mock;
const mockGetVideoDownloadUrl = getVideoDownloadUrl as jest.Mock;

describe('MiniMax Operations', () => {
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
		it('should send correct request body and return simplified response', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'MiniMax-M2.7',
						'messages.values': [{ role: 'user', content: 'Hello' }],
						options: { temperature: 0.7 },
						simplify: true,
						'options.maxToolsIterations': 15,
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				choices: [{ message: { content: 'Hi there!' }, finish_reason: 'stop' }],
				usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await textMessageExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/chat/completions', {
				body: expect.objectContaining({
					model: 'MiniMax-M2.7',
					messages: [{ role: 'user', content: 'Hello' }],
					reasoning_split: true,
				}),
			});
			expect(result[0].json).toEqual({ content: 'Hi there!' });
		});

		it('should return full response when simplify is false', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'MiniMax-M2.7',
						'messages.values': [{ role: 'user', content: 'Hello' }],
						options: {},
						simplify: false,
						'options.maxToolsIterations': 15,
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				choices: [{ message: { content: 'Hi!' }, finish_reason: 'stop' }],
				usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await textMessageExecute.call(mockExecuteFunctions, 0);

			expect(result[0].json).toEqual(
				expect.objectContaining({
					choices: expect.any(Array),
					usage: expect.any(Object),
				}),
			);
		});

		it('should include system message when provided', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'MiniMax-M2.7',
						'messages.values': [{ role: 'user', content: 'Hello' }],
						options: { system: 'You are a helpful assistant' },
						simplify: true,
						'options.maxToolsIterations': 15,
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				choices: [{ message: { content: 'Hi!' }, finish_reason: 'stop' }],
				usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			await textMessageExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/chat/completions', {
				body: expect.objectContaining({
					messages: expect.arrayContaining([
						{ role: 'system', content: 'You are a helpful assistant' },
					]),
				}),
			});
		});
	});

	describe('Image: generate', () => {
		it('should send prompt and return URL-only when downloadImage is false', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'image-01',
						prompt: 'A sunset over mountains',
						aspectRatio: '16:9',
						numberOfImages: 1,
						downloadImage: false,
						options: {},
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				data: { image_urls: ['https://cdn.minimax.io/image.png'] },
				metadata: { success_count: 1, failed_count: 0 },
				base_resp: { status_code: 0, status_msg: 'success' },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await imageGenerateExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/image_generation', {
				body: expect.objectContaining({
					model: 'image-01',
					prompt: 'A sunset over mountains',
					aspect_ratio: '16:9',
					n: 1,
				}),
			});
			expect(result[0].json).toEqual({ imageUrl: 'https://cdn.minimax.io/image.png' });
			expect(result[0].binary).toBeUndefined();
		});

		it('should download image as binary when downloadImage is true', async () => {
			const deepMock = mockDeep<IExecuteFunctions>();
			deepMock.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'image-01',
						prompt: 'A sunset',
						aspectRatio: '1:1',
						numberOfImages: 1,
						downloadImage: true,
						options: {},
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				data: { image_urls: ['https://cdn.minimax.io/image.png'] },
				metadata: { success_count: 1, failed_count: 0 },
				base_resp: { status_code: 0, status_msg: 'success' },
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
				fileName: 'image_0.png',
			};
			deepMock.helpers.prepareBinaryData.mockResolvedValue(mockBinaryData);

			const result = await imageGenerateExecute.call(deepMock, 0);

			expect(deepMock.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: 'https://cdn.minimax.io/image.png',
					encoding: 'arraybuffer',
					returnFullResponse: true,
				}),
			);
			expect(result[0].binary).toBeDefined();
			expect(result[0].binary!.data).toEqual(mockBinaryData);
		});
	});

	describe('Video: textToVideo', () => {
		it('should create task, poll until success, and return video URL', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'MiniMax-Hailuo-2.3',
						prompt: 'A cat playing with yarn',
						duration: 6,
						resolution: '768P',
						downloadVideo: false,
						options: {},
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({
				task_id: 'video-task-1',
				base_resp: { status_code: 0, status_msg: 'success' },
			});

			mockPollVideoTask.mockResolvedValue({ fileId: 'file-abc', status: 'Success' });
			mockGetVideoDownloadUrl.mockResolvedValue('https://cdn.minimax.io/video.mp4');

			const result = await videoT2VExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/video_generation', {
				body: expect.objectContaining({
					model: 'MiniMax-Hailuo-2.3',
					prompt: 'A cat playing with yarn',
					duration: 6,
					resolution: '768P',
				}),
			});
			expect(mockPollVideoTask).toHaveBeenCalledWith('video-task-1');
			expect(result[0].json).toEqual(
				expect.objectContaining({
					videoUrl: 'https://cdn.minimax.io/video.mp4',
					taskId: 'video-task-1',
					fileId: 'file-abc',
				}),
			);
		});
	});

	describe('Video: imageToVideo', () => {
		it('should create task with image URL input and return video URL', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'MiniMax-Hailuo-2.3',
						imageInputType: 'url',
						imageUrl: 'https://example.com/frame.png',
						prompt: 'A bird taking flight',
						duration: 6,
						resolution: '768P',
						downloadVideo: false,
						options: {},
					};
					return params[param] ?? fallback;
				},
			);

			mockApiRequest.mockResolvedValue({
				task_id: 'i2v-task-1',
				base_resp: { status_code: 0, status_msg: 'success' },
			});

			mockPollVideoTask.mockResolvedValue({ fileId: 'file-i2v', status: 'Success' });
			mockGetVideoDownloadUrl.mockResolvedValue('https://cdn.minimax.io/i2v-video.mp4');

			const result = await videoI2VExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/video_generation', {
				body: expect.objectContaining({
					model: 'MiniMax-Hailuo-2.3',
					first_frame_image: 'https://example.com/frame.png',
					prompt: 'A bird taking flight',
				}),
			});
			expect(result[0].json).toEqual(
				expect.objectContaining({
					videoUrl: 'https://cdn.minimax.io/i2v-video.mp4',
				}),
			);
		});
	});

	describe('Audio: textToSpeech', () => {
		it('should send TTS request and return audio URL when downloadAudio is false', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'speech-2.8-hd',
						text: 'Hello world',
						voiceId: 'English_Graceful_Lady',
						downloadAudio: false,
						options: {},
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				data: { audio: 'https://cdn.minimax.io/speech.mp3', status: 1 },
				extra_info: {
					audio_length: 1500,
					audio_format: 'mp3',
					audio_size: 24000,
					word_count: 2,
					usage_characters: 11,
				},
				base_resp: { status_code: 0, status_msg: 'success' },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const result = await audioTTSExecute.call(mockExecuteFunctions, 0);

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/t2a_v2', {
				body: expect.objectContaining({
					model: 'speech-2.8-hd',
					text: 'Hello world',
					voice_setting: expect.objectContaining({
						voice_id: 'English_Graceful_Lady',
					}),
				}),
			});
			expect(result[0].json).toEqual(
				expect.objectContaining({
					audioUrl: 'https://cdn.minimax.io/speech.mp3',
					audioLength: 1500,
					audioFormat: 'mp3',
				}),
			);
		});

		it('should download audio as binary when downloadAudio is true', async () => {
			const deepMock = mockDeep<IExecuteFunctions>();
			deepMock.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'speech-2.8-hd',
						text: 'Hello world',
						voiceId: 'English_Graceful_Lady',
						downloadAudio: true,
						options: {},
					};
					return params[param] ?? fallback;
				},
			);

			const mockResponse = {
				data: { audio: 'https://cdn.minimax.io/speech.mp3', status: 1 },
				extra_info: {
					audio_length: 1500,
					audio_format: 'mp3',
					audio_size: 24000,
					word_count: 2,
					usage_characters: 11,
				},
				base_resp: { status_code: 0, status_msg: 'success' },
			};
			mockApiRequest.mockResolvedValue(mockResponse);

			const audioBuffer = Buffer.from('fake-audio-data');
			deepMock.helpers.httpRequest.mockResolvedValue({
				body: audioBuffer,
				headers: { 'content-type': 'audio/mpeg' },
			});

			const mockBinaryData: IBinaryData = {
				mimeType: 'audio/mpeg',
				fileType: 'audio',
				fileExtension: 'mp3',
				data: '',
				fileName: 'speech.mp3',
			};
			deepMock.helpers.prepareBinaryData.mockResolvedValue(mockBinaryData);

			const result = await audioTTSExecute.call(deepMock, 0);

			expect(deepMock.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: 'https://cdn.minimax.io/speech.mp3',
					encoding: 'arraybuffer',
					returnFullResponse: true,
				}),
			);
			expect(result[0].binary).toBeDefined();
			expect(result[0].binary!.data).toEqual(mockBinaryData);
		});
	});
});
