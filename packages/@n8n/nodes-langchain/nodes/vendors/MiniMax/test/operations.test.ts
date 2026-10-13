import type { IExecuteFunctions, IBinaryData } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

vi.mock('../transport', () => ({
	apiRequest: vi.fn(),
	generateVideo: vi.fn(),
}));

vi.mock('@utils/helpers', () => ({
	getConnectedTools: vi.fn().mockResolvedValue([]),
}));

vi.mock('zod-to-json-schema', () => ({
	__esModule: true,
	default: vi.fn(),
}));

vi.mock('n8n-workflow', async () => {
	const actual = await import('n8n-workflow');
	return {
		...actual,
		accumulateTokenUsage: vi.fn(),
	};
});

import { execute as audioTTSExecute } from '../actions/audio/tts.operation';
import { execute as imageGenerateExecute } from '../actions/image/generate.operation';
import {
	description as textMessageDescription,
	execute as textMessageExecute,
} from '../actions/text/message.operation';
import {
	description as videoI2VDescription,
	execute as videoI2VExecute,
} from '../actions/video/generate.i2v.operation';
import {
	description as videoT2VDescription,
	execute as videoT2VExecute,
} from '../actions/video/generate.t2v.operation';
import { prepareVideoOutput } from '../actions/video/helpers';
import { versionDescription } from '../actions/versionDescription';
import { apiRequest, generateVideo } from '../transport';

import type { Mock } from 'vitest';

const mockApiRequest = apiRequest as Mock;
const mockGenerateVideo = generateVideo as Mock;

describe('MiniMax Operations', () => {
	let mockExecuteFunctions: ReturnType<typeof mock<IExecuteFunctions>>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.getNodeInputs.mockReturnValue([{ type: 'main' }]);
		mockExecuteFunctions.getExecutionCancelSignal.mockReturnValue(undefined);
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node-id',
			name: 'MiniMax',
			type: '@n8n/n8n-nodes-langchain.minimax',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should use version 1.2 for newly added nodes', () => {
		expect(versionDescription).toMatchObject({
			version: [1, 1.1, 1.2],
			defaultVersion: 1.2,
		});
	});

	it('should preserve downloaded V1 video output', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		const videoBuffer = Buffer.from('fake-video-data');
		const binaryData: IBinaryData = {
			mimeType: 'video/mp4',
			fileType: 'video',
			fileExtension: 'mp4',
			data: '',
			fileName: 'video.mp4',
		};
		executeFunctions.helpers.httpRequest.mockResolvedValue({
			body: videoBuffer,
			headers: { 'content-type': 'video/mp4' },
		});
		executeFunctions.helpers.prepareBinaryData.mockResolvedValue(binaryData);

		const result = await prepareVideoOutput(
			executeFunctions,
			0,
			{
				videoUrl: 'https://cdn.minimax.io/video.mp4',
				taskId: 'task-v1',
				fileId: 'file-v1',
			},
			true,
		);

		expect(executeFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'GET',
			url: 'https://cdn.minimax.io/video.mp4',
			encoding: 'arraybuffer',
			returnFullResponse: true,
		});
		expect(executeFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
			videoBuffer,
			'video.mp4',
			'video/mp4',
		);
		expect(result).toEqual([
			{
				binary: { data: binaryData },
				json: {
					videoUrl: 'https://cdn.minimax.io/video.mp4',
					taskId: 'task-v1',
					fileId: 'file-v1',
				},
				pairedItem: { item: 0 },
			},
		]);
	});

	describe('Text: message', () => {
		it('should preserve the M2.7 default for version 1 and use M3 for version 1.1', () => {
			const legacyModelProperty = textMessageDescription.find(
				({ name, default: defaultValue }) => name === 'modelId' && defaultValue === 'MiniMax-M2.7',
			);
			const staticModelProperty = textMessageDescription.find(
				({ name, default: defaultValue }) => name === 'modelId' && defaultValue === 'MiniMax-M3',
			);

			expect(legacyModelProperty).toMatchObject({
				default: 'MiniMax-M2.7',
				displayOptions: {
					show: expect.objectContaining({ '@version': [1] }),
				},
			});
			expect(legacyModelProperty?.options).not.toContainEqual({
				name: 'MiniMax-M3',
				value: 'MiniMax-M3',
			});
			expect(staticModelProperty).toMatchObject({
				default: 'MiniMax-M3',
				options: expect.arrayContaining([{ name: 'MiniMax-M3', value: 'MiniMax-M3' }]),
				displayOptions: {
					show: expect.objectContaining({ '@version': [1.1] }),
				},
			});
		});

		it('should use a searchable resourceLocator for version 1.2 and later', () => {
			const currentModelProperty = textMessageDescription.find(
				({ name, type }) => name === 'modelId' && type === 'resourceLocator',
			);

			expect(currentModelProperty).toMatchObject({
				type: 'resourceLocator',
				default: { mode: 'list', value: 'MiniMax-M3' },
				modes: expect.arrayContaining([
					expect.objectContaining({
						name: 'list',
						typeOptions: { searchListMethod: 'modelSearch', searchable: true },
					}),
				]),
				displayOptions: {
					show: expect.objectContaining({ '@version': [{ _cnd: { gte: 1.2 } }] }),
				},
			});
		});

		it('should send correct request body and return simplified response', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'MiniMax-M3',
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

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/v1/chat/completions', {
				body: expect.objectContaining({
					model: 'MiniMax-M3',
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

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/v1/chat/completions', {
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

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/v1/image_generation', {
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
		it('should keep H3 parameters separate from legacy parameters', () => {
			const legacyModelProperty = videoT2VDescription.find(
				({ name, default: defaultValue }) =>
					name === 'modelId' && defaultValue === 'MiniMax-Hailuo-2.3',
			);
			const currentModelProperty = videoT2VDescription.find(
				({ name, default: defaultValue }) => name === 'modelId' && defaultValue === 'MiniMax-H3',
			);
			const h3Duration = videoT2VDescription.find(({ name }) => name === 'h3Duration');
			const legacyDuration = videoT2VDescription.find(({ name }) => name === 'duration');
			const h3Resolution = videoT2VDescription.find(({ name }) => name === 'h3Resolution');
			const legacyResolution = videoT2VDescription.find(({ name }) => name === 'resolution');

			expect(legacyModelProperty).toMatchObject({
				default: 'MiniMax-Hailuo-2.3',
				displayOptions: { show: expect.objectContaining({ '@version': [1] }) },
			});
			expect(currentModelProperty).toMatchObject({
				default: 'MiniMax-H3',
				displayOptions: {
					show: expect.objectContaining({ '@version': [{ _cnd: { gte: 1.1 } }] }),
				},
			});
			expect(h3Duration).toMatchObject({ default: 5 });
			expect(legacyDuration).toMatchObject({ default: 6 });
			expect(h3Resolution).toMatchObject({ default: '2K' });
			expect(legacyResolution).toMatchObject({ default: '768P' });
		});

		it('should create an H3 task through the V2 API', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'MiniMax-H3',
						prompt: 'A cat playing with yarn',
						h3Duration: 5,
						h3Resolution: '2K',
						duration: 10,
						resolution: '1080P',
						ratio: '16:9',
						downloadVideo: false,
					};
					return params[param] ?? fallback;
				},
			);
			mockGenerateVideo.mockResolvedValue({
				videoUrl: 'https://cdn.minimax.io/h3-video.mp4',
				taskId: 'h3-task-1',
			});

			const result = await videoT2VExecute.call(mockExecuteFunctions, 0);

			expect(mockGenerateVideo).toHaveBeenCalledWith('v2', {
				model: 'MiniMax-H3',
				content: [{ type: 'text', text: 'A cat playing with yarn' }],
				duration: 5,
				resolution: '2K',
				ratio: '16:9',
			});
			expect(result[0].json).toEqual({
				videoUrl: 'https://cdn.minimax.io/h3-video.mp4',
				taskId: 'h3-task-1',
			});
		});

		it('should reject an empty H3 prompt before making a request', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'MiniMax-H3',
						prompt: ' ',
						downloadVideo: false,
					};
					return params[param] ?? fallback;
				},
			);

			await expect(videoT2VExecute.call(mockExecuteFunctions, 0)).rejects.toThrow(
				'Prompt is required for MiniMax-H3 video generation',
			);
			expect(mockGenerateVideo).not.toHaveBeenCalled();
		});

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

			mockGenerateVideo.mockResolvedValue({
				videoUrl: 'https://cdn.minimax.io/video.mp4',
				taskId: 'video-task-1',
				fileId: 'file-abc',
			});

			const result = await videoT2VExecute.call(mockExecuteFunctions, 0);

			expect(mockGenerateVideo).toHaveBeenCalledWith('v1', {
				model: 'MiniMax-Hailuo-2.3',
				prompt: 'A cat playing with yarn',
				duration: 6,
				resolution: '768P',
			});
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
		it('should keep H3 parameters separate from legacy parameters', () => {
			const legacyModelProperty = videoI2VDescription.find(
				({ name, default: defaultValue }) =>
					name === 'modelId' && defaultValue === 'MiniMax-Hailuo-2.3',
			);
			const currentModelProperty = videoI2VDescription.find(
				({ name, default: defaultValue }) => name === 'modelId' && defaultValue === 'MiniMax-H3',
			);
			const h3Duration = videoI2VDescription.find(({ name }) => name === 'h3Duration');
			const legacyDuration = videoI2VDescription.find(({ name }) => name === 'duration');
			const h3Resolution = videoI2VDescription.find(({ name }) => name === 'h3Resolution');
			const legacyResolution = videoI2VDescription.find(({ name }) => name === 'resolution');

			expect(legacyModelProperty).toMatchObject({
				default: 'MiniMax-Hailuo-2.3',
				displayOptions: { show: expect.objectContaining({ '@version': [1] }) },
			});
			expect(currentModelProperty).toMatchObject({
				default: 'MiniMax-H3',
				displayOptions: {
					show: expect.objectContaining({ '@version': [{ _cnd: { gte: 1.1 } }] }),
				},
			});
			expect(h3Duration).toMatchObject({ default: 5 });
			expect(legacyDuration).toMatchObject({ default: 6 });
			expect(h3Resolution).toMatchObject({ default: '2K' });
			expect(legacyResolution).toMatchObject({ default: '768P' });
		});

		it('should create an H3 task with first and last frames through the V2 API', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'MiniMax-H3',
						imageInputType: 'url',
						imageUrl: 'https://example.com/first.png',
						prompt: 'A bird taking flight',
						h3Duration: 5,
						h3Resolution: '2K',
						downloadVideo: false,
						options: {
							lastFrameInputType: 'url',
							lastFrameImageUrl: 'https://example.com/last.png',
						},
					};
					return params[param] ?? fallback;
				},
			);
			mockGenerateVideo.mockResolvedValue({
				videoUrl: 'https://cdn.minimax.io/h3-i2v-video.mp4',
				taskId: 'h3-i2v-task-1',
			});

			const result = await videoI2VExecute.call(mockExecuteFunctions, 0);

			expect(mockGenerateVideo).toHaveBeenCalledWith('v2', {
				model: 'MiniMax-H3',
				content: [
					{ type: 'text', text: 'A bird taking flight' },
					{
						type: 'image_url',
						image_url: { url: 'https://example.com/first.png' },
						role: 'first_frame',
					},
					{
						type: 'image_url',
						image_url: { url: 'https://example.com/last.png' },
						role: 'last_frame',
					},
				],
				duration: 5,
				resolution: '2K',
				ratio: 'adaptive',
			});
			expect(result[0].json).toEqual({
				videoUrl: 'https://cdn.minimax.io/h3-i2v-video.mp4',
				taskId: 'h3-i2v-task-1',
			});
		});

		it('should reject an empty H3 prompt inherited from a legacy workflow', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'MiniMax-H3',
						imageInputType: 'url',
						imageUrl: 'https://example.com/first.png',
						prompt: '',
						downloadVideo: false,
						options: {},
					};
					return params[param] ?? fallback;
				},
			);

			await expect(videoI2VExecute.call(mockExecuteFunctions, 0)).rejects.toThrow(
				'Prompt is required for MiniMax-H3 video generation',
			);
			expect(mockGenerateVideo).not.toHaveBeenCalled();
		});

		it('should send H3 binary image input as a data URL', async () => {
			const deepMock = mockDeep<IExecuteFunctions>();
			deepMock.getNodeParameter.mockImplementation(
				(param: string, _index: number, fallback?: any) => {
					const params: Record<string, unknown> = {
						modelId: 'MiniMax-H3',
						imageInputType: 'binary',
						binaryPropertyName: 'data',
						prompt: 'A bird taking flight',
						h3Duration: 5,
						h3Resolution: '2K',
						downloadVideo: false,
						options: {},
					};
					return params[param] ?? fallback;
				},
			);
			deepMock.helpers.assertBinaryData.mockReturnValue(
				mock<IBinaryData>({ mimeType: 'image/png', data: '' }),
			);
			deepMock.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('image'));
			mockGenerateVideo.mockResolvedValue({
				videoUrl: 'https://cdn.minimax.io/h3-i2v-video.mp4',
				taskId: 'h3-i2v-task-1',
			});

			await videoI2VExecute.call(deepMock, 0);

			expect(mockGenerateVideo).toHaveBeenCalledWith(
				'v2',
				expect.objectContaining({
					content: expect.arrayContaining([
						{
							type: 'image_url',
							image_url: { url: 'data:image/png;base64,aW1hZ2U=' },
							role: 'first_frame',
						},
					]),
				}),
			);
		});

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

			mockGenerateVideo.mockResolvedValue({
				videoUrl: 'https://cdn.minimax.io/i2v-video.mp4',
				taskId: 'i2v-task-1',
				fileId: 'file-i2v',
			});

			const result = await videoI2VExecute.call(mockExecuteFunctions, 0);

			expect(mockGenerateVideo).toHaveBeenCalledWith('v1', {
				model: 'MiniMax-Hailuo-2.3',
				first_frame_image: 'https://example.com/frame.png',
				prompt: 'A bird taking flight',
				duration: 6,
				resolution: '768P',
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

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/v1/t2a_v2', {
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
