import * as helpers from '@utils/helpers';
import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, IBinaryData, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as audio from './actions/audio';
import * as file from './actions/file';
import * as image from './actions/image';
import * as text from './actions/text';
import * as video from './actions/video';
import * as utils from './helpers/utils';
import * as transport from './transport';

describe('GoogleGemini Node', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const apiRequestMock = jest.spyOn(transport, 'apiRequest');
	const getConnectedToolsMock = jest.spyOn(helpers, 'getConnectedTools');
	const downloadFileMock = jest.spyOn(utils, 'downloadFile');
	const uploadFileMock = jest.spyOn(utils, 'uploadFile');

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Text -> Message', () => {
		it('should call the api with the correct parameters', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/gemini-2.5-flash';
					case 'messages.values':
						return [{ role: 'user', content: 'Hello, world!' }];
					case 'simplify':
						return true;
					case 'jsonOutput':
						return true;
					case 'options':
						return {
							systemMessage: 'You are a helpful assistant.',
							codeExecution: true,
							frequencyPenalty: 0,
							maxOutputTokens: 100,
							candidateCount: 1,
							presencePenalty: 0,
							temperature: 0.5,
							topP: 0.5,
							topK: 10,
						};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getNodeInputs.mockReturnValue([{ type: 'main' }, { type: 'ai_tool' }]);
			getConnectedToolsMock.mockResolvedValue([]);
			apiRequestMock.mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [{ text: 'Hello, world!' }],
							role: 'model',
						},
					},
				],
			});

			const result = await text.message.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: {
							parts: [{ text: 'Hello, world!' }],
							role: 'model',
						},
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/models/gemini-2.5-flash:generateContent',
				{
					body: {
						contents: [
							{
								parts: [{ text: 'Hello, world!' }],
								role: 'user',
							},
						],
						tools: [
							{
								codeExecution: {},
							},
						],
						generationConfig: {
							candidateCount: 1,
							frequencyPenalty: 0,
							maxOutputTokens: 100,
							presencePenalty: 0,
							temperature: 0.5,
							topP: 0.5,
							topK: 10,
							responseMimeType: 'application/json',
						},
						systemInstruction: {
							parts: [{ text: 'You are a helpful assistant.' }],
						},
					},
				},
			);
		});
	});

	describe('Audio -> Analyze', () => {
		it('should analyze audio from URL', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/gemini-2.5-flash';
					case 'inputType':
						return 'url';
					case 'audioUrls':
						return 'https://example.com/audio.mp3';
					case 'text':
						return "What's in this audio?";
					case 'simplify':
						return true;
					case 'options':
						return {
							maxOutputTokens: 300,
						};
					default:
						return undefined;
				}
			});
			downloadFileMock.mockResolvedValue({
				fileContent: Buffer.from('test'),
				mimeType: 'audio/mpeg',
			});
			uploadFileMock.mockResolvedValue({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'audio/mpeg',
			});
			apiRequestMock.mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [{ text: 'This audio contains a person speaking about AI.' }],
							role: 'model',
						},
					},
				],
			});

			const result = await audio.analyze.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: {
							parts: [{ text: 'This audio contains a person speaking about AI.' }],
							role: 'model',
						},
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(downloadFileMock).toHaveBeenCalledWith('https://example.com/audio.mp3', 'audio/mpeg');
			expect(uploadFileMock).toHaveBeenCalledWith(Buffer.from('test'), 'audio/mpeg');
			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/models/gemini-2.5-flash:generateContent',
				{
					body: {
						contents: [
							{
								parts: [
									{
										fileData: {
											fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
											mimeType: 'audio/mpeg',
										},
									},
									{
										text: "What's in this audio?",
									},
								],
								role: 'user',
							},
						],
						generationConfig: {
							maxOutputTokens: 300,
						},
					},
				},
			);
		});

		it('should analyze audio from binary data', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/gemini-2.5-flash';
					case 'inputType':
						return 'binary';
					case 'binaryPropertyName':
						return 'data';
					case 'text':
						return "What's in this audio?";
					case 'simplify':
						return true;
					case 'options':
						return {
							maxOutputTokens: 300,
						};
					default:
						return undefined;
				}
			});
			const mockBinaryData: IBinaryData = {
				mimeType: 'audio/mpeg',
				fileName: 'test.mp3',
				fileSize: '1024',
				fileExtension: 'mp3',
				data: 'test',
			};
			executeFunctionsMock.helpers.assertBinaryData.mockReturnValue(mockBinaryData);
			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('test'));
			uploadFileMock.mockResolvedValue({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'audio/mpeg',
			});
			apiRequestMock.mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [{ text: 'This audio contains a person speaking about AI.' }],
							role: 'model',
						},
					},
				],
			});

			const result = await audio.analyze.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: {
							parts: [{ text: 'This audio contains a person speaking about AI.' }],
							role: 'model',
						},
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(uploadFileMock).toHaveBeenCalledWith(Buffer.from('test'), 'audio/mpeg');
			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/models/gemini-2.5-flash:generateContent',
				{
					body: {
						contents: [
							{
								parts: [
									{
										fileData: {
											fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
											mimeType: 'audio/mpeg',
										},
									},
									{
										text: "What's in this audio?",
									},
								],
								role: 'user',
							},
						],
						generationConfig: {
							maxOutputTokens: 300,
						},
					},
				},
			);
		});

		it('should analyze audio from Google API URL', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/gemini-2.5-flash';
					case 'inputType':
						return 'url';
					case 'audioUrls':
						return 'https://generativelanguage.googleapis.com/v1/files/abc123';
					case 'text':
						return "What's in this audio?";
					case 'simplify':
						return true;
					case 'options':
						return {
							maxOutputTokens: 300,
						};
					default:
						return undefined;
				}
			});

			apiRequestMock.mockImplementation(async (method: string) => {
				if (method === 'GET') {
					return { mimeType: 'audio/mpeg' };
				}
				return {
					candidates: [
						{
							content: {
								parts: [{ text: 'This audio contains a person speaking about AI.' }],
								role: 'model',
							},
						},
					],
				};
			});

			const result = await audio.analyze.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: {
							parts: [{ text: 'This audio contains a person speaking about AI.' }],
							role: 'model',
						},
					},
					pairedItem: { item: 0 },
				},
			]);

			expect(downloadFileMock).not.toHaveBeenCalled();
			expect(uploadFileMock).not.toHaveBeenCalled();
			expect(apiRequestMock).toHaveBeenCalledWith('GET', '', {
				option: { url: 'https://generativelanguage.googleapis.com/v1/files/abc123' },
			});
			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/models/gemini-2.5-flash:generateContent',
				{
					body: {
						contents: [
							{
								parts: [
									{
										fileData: {
											fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
											mimeType: 'audio/mpeg',
										},
									},
									{
										text: "What's in this audio?",
									},
								],
								role: 'user',
							},
						],
						generationConfig: {
							maxOutputTokens: 300,
						},
					},
				},
			);
		});
	});

	describe('Audio -> Transcribe', () => {
		it('should transcribe audio from URL', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/gemini-2.5-flash';
					case 'inputType':
						return 'url';
					case 'audioUrls':
						return 'https://example.com/audio.mp3';
					case 'simplify':
						return true;
					case 'options':
						return {
							startTime: '00:15',
							endTime: '02:15',
						};
					default:
						return undefined;
				}
			});
			downloadFileMock.mockResolvedValue({
				fileContent: Buffer.from('test'),
				mimeType: 'audio/mpeg',
			});
			uploadFileMock.mockResolvedValue({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'audio/mpeg',
			});
			apiRequestMock.mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [{ text: 'This is the transcribed text from 00:15 to 02:15.' }],
							role: 'model',
						},
					},
				],
			});

			const result = await audio.transcribe.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: {
							parts: [{ text: 'This is the transcribed text from 00:15 to 02:15.' }],
							role: 'model',
						},
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(downloadFileMock).toHaveBeenCalledWith('https://example.com/audio.mp3', 'audio/mpeg');
			expect(uploadFileMock).toHaveBeenCalledWith(Buffer.from('test'), 'audio/mpeg');
			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/models/gemini-2.5-flash:generateContent',
				{
					body: {
						contents: [
							{
								parts: [
									{
										fileData: {
											fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
											mimeType: 'audio/mpeg',
										},
									},
									{
										text: 'Generate a transcript of the speech from 00:15 to 02:15',
									},
								],
								role: 'user',
							},
						],
					},
				},
			);
		});

		it('should transcribe audio from binary data', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/gemini-2.5-flash';
					case 'inputType':
						return 'binary';
					case 'binaryPropertyName':
						return 'data';
					case 'simplify':
						return true;
					case 'options':
						return {};
					default:
						return undefined;
				}
			});
			const mockBinaryData: IBinaryData = {
				mimeType: 'audio/mpeg',
				fileName: 'test.mp3',
				fileSize: '1024',
				fileExtension: 'mp3',
				data: 'test',
			};
			executeFunctionsMock.helpers.assertBinaryData.mockReturnValue(mockBinaryData);
			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('test'));
			uploadFileMock.mockResolvedValue({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'audio/mpeg',
			});
			apiRequestMock.mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [{ text: 'This is the transcribed text.' }],
							role: 'model',
						},
					},
				],
			});

			const result = await audio.transcribe.execute.call(executeFunctionsMock, 0);
			expect(result).toEqual([
				{
					json: {
						content: {
							parts: [{ text: 'This is the transcribed text.' }],
							role: 'model',
						},
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(uploadFileMock).toHaveBeenCalledWith(Buffer.from('test'), 'audio/mpeg');
			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/models/gemini-2.5-flash:generateContent',
				{
					body: {
						contents: [
							{
								parts: [
									{
										fileData: {
											fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
											mimeType: 'audio/mpeg',
										},
									},
									{
										text: 'Generate a transcript of the speech',
									},
								],
								role: 'user',
							},
						],
					},
				},
			);
		});

		it('should transcribe audio from Google API URL', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/gemini-2.5-flash';
					case 'inputType':
						return 'url';
					case 'audioUrls':
						return 'https://generativelanguage.googleapis.com/v1/files/abc123';
					case 'text':
						return "What's in this audio?";
					case 'simplify':
						return true;
					case 'options':
						return {
							startTime: '00:15',
							endTime: '02:15',
						};
					default:
						return undefined;
				}
			});

			apiRequestMock.mockImplementation(async (method: string) => {
				if (method === 'GET') {
					return { mimeType: 'audio/mpeg' };
				}
				return {
					candidates: [
						{
							content: {
								parts: [{ text: 'This is the transcribed text from 00:15 to 02:15.' }],
								role: 'model',
							},
						},
					],
				};
			});

			const result = await audio.transcribe.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						content: {
							parts: [{ text: 'This is the transcribed text from 00:15 to 02:15.' }],
							role: 'model',
						},
					},
					pairedItem: { item: 0 },
				},
			]);

			expect(downloadFileMock).not.toHaveBeenCalled();
			expect(uploadFileMock).not.toHaveBeenCalled();
			expect(apiRequestMock).toHaveBeenCalledWith('GET', '', {
				option: { url: 'https://generativelanguage.googleapis.com/v1/files/abc123' },
			});
			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/models/gemini-2.5-flash:generateContent',
				{
					body: {
						contents: [
							{
								parts: [
									{
										fileData: {
											fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
											mimeType: 'audio/mpeg',
										},
									},
									{
										text: 'Generate a transcript of the speech from 00:15 to 02:15',
									},
								],
								role: 'user',
							},
						],
					},
				},
			);
		});
	});

	describe('File -> Upload', () => {
		it('should upload file from URL', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'inputType':
						return 'url';
					case 'fileUrl':
						return 'https://example.com/file.pdf';
					default:
						return undefined;
				}
			});
			downloadFileMock.mockResolvedValue({
				fileContent: Buffer.from('test'),
				mimeType: 'application/pdf',
			});
			uploadFileMock.mockResolvedValue({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'application/pdf',
			});
			const result = await file.upload.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
						mimeType: 'application/pdf',
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(downloadFileMock).toHaveBeenCalledWith(
				'https://example.com/file.pdf',
				'application/octet-stream',
			);
			expect(uploadFileMock).toHaveBeenCalledWith(Buffer.from('test'), 'application/pdf');
		});

		it('should upload file from binary data', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'inputType':
						return 'binary';
					case 'binaryPropertyName':
						return 'data';
					default:
						return undefined;
				}
			});
			const mockBinaryData: IBinaryData = {
				mimeType: 'application/pdf',
				fileName: 'test.pdf',
				fileSize: '1024',
				fileExtension: 'pdf',
				data: 'test',
			};
			executeFunctionsMock.helpers.assertBinaryData.mockReturnValue(mockBinaryData);
			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('test'));
			uploadFileMock.mockResolvedValue({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'application/pdf',
			});

			const result = await file.upload.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
						mimeType: 'application/pdf',
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(uploadFileMock).toHaveBeenCalledWith(Buffer.from('test'), 'application/pdf');
		});
	});

	describe('Image -> Generate', () => {
		it('should generate image using Gemini model', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/gemini-2.0-flash-preview-image-generation';
					case 'prompt':
						return 'A cute cat eating a dinosaur';
					case 'options.binaryPropertyOutput':
						return 'data';
					default:
						return undefined;
				}
			});
			apiRequestMock.mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [
								{
									inlineData: {
										data: 'abcdefgh',
										mimeType: 'image/png',
									},
								},
							],
						},
					},
				],
			});
			executeFunctionsMock.helpers.prepareBinaryData.mockResolvedValue({
				mimeType: 'image/png',
				fileName: 'image.png',
				fileSize: '100',
				data: 'abcdefgh',
			});

			const result = await image.generate.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					binary: {
						data: {
							mimeType: 'image/png',
							fileName: 'image.png',
							fileSize: '100',
							data: 'abcdefgh',
						},
					},
					json: {
						mimeType: 'image/png',
						fileName: 'image.png',
						fileSize: '100',
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent',
				{
					body: {
						contents: [
							{
								role: 'user',
								parts: [{ text: 'A cute cat eating a dinosaur' }],
							},
						],
						generationConfig: {
							responseModalities: ['IMAGE', 'TEXT'],
						},
					},
				},
			);
		});

		it('should generate multiple images using Imagen model', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/imagen-3.0-generate-002';
					case 'prompt':
						return 'A cute cat eating a dinosaur';
					case 'options.sampleCount':
						return 2;
					case 'options.binaryPropertyOutput':
						return 'data';
					default:
						return undefined;
				}
			});
			apiRequestMock.mockResolvedValue({
				predictions: [
					{
						bytesBase64Encoded: 'abcdefgh',
						mimeType: 'image/png',
					},
					{
						bytesBase64Encoded: 'abcdefgh',
						mimeType: 'image/png',
					},
				],
			});
			executeFunctionsMock.helpers.prepareBinaryData.mockResolvedValue({
				mimeType: 'image/png',
				fileName: 'image.png',
				fileSize: '100',
				data: 'abcdefgh',
			});

			const result = await image.generate.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					binary: {
						data: {
							mimeType: 'image/png',
							fileName: 'image.png',
							fileSize: '100',
							data: 'abcdefgh',
						},
					},
					json: {
						mimeType: 'image/png',
						fileName: 'image.png',
						fileSize: '100',
					},
					pairedItem: { item: 0 },
				},
				{
					binary: {
						data: {
							mimeType: 'image/png',
							fileName: 'image.png',
							fileSize: '100',
							data: 'abcdefgh',
						},
					},
					json: {
						mimeType: 'image/png',
						fileName: 'image.png',
						fileSize: '100',
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/models/imagen-3.0-generate-002:predict',
				{
					body: {
						instances: [
							{
								prompt: 'A cute cat eating a dinosaur',
							},
						],
						parameters: {
							sampleCount: 2,
						},
					},
				},
			);
		});

		it('should throw error for unsupported model', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/unsupported-model';
					case 'prompt':
						return 'A cute cat eating a dinosaur';
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getNode.mockReturnValue({
				id: '1',
				name: 'Google Gemini',
			} as INode);

			await expect(image.generate.execute.call(executeFunctionsMock, 0)).rejects.toThrow(
				new NodeOperationError(
					executeFunctionsMock.getNode(),
					'Model models/unsupported-model is not supported for image generation',
					{
						description: 'Please check the model ID and try again.',
					},
				),
			);
		});
	});

	describe('Video -> Generate', () => {
		beforeEach(() => {
			jest.useFakeTimers({ advanceTimers: true });
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should generate video using Veo model', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/veo-3.0-generate-002';
					case 'prompt':
						return 'Panning wide shot of a calico kitten sleeping in the sunshine';
					case 'options':
						return {
							aspectRatio: '16:9',
							personGeneration: 'dont_allow',
							sampleCount: 1,
							durationSeconds: 8,
						};
					case 'options.binaryPropertyOutput':
						return 'data';
					case 'returnAs':
						return 'video';
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getCredentials.mockResolvedValue({ apiKey: 'test-api-key' });
			let pollCount = 0;
			apiRequestMock.mockImplementation(async (_method: string, path: string) => {
				if (path.includes(':predictLongRunning')) {
					return {
						name: 'operations/123',
						done: false,
					};
				}
				pollCount++;
				return {
					name: 'operations/123',
					done: pollCount > 1,
					response:
						pollCount > 1
							? {
									generateVideoResponse: {
										generatedSamples: [
											{
												video: {
													uri: 'https://example.com/video.mp4',
												},
											},
										],
									},
								}
							: undefined,
				};
			});
			downloadFileMock.mockResolvedValue({
				fileContent: Buffer.from('abcdefgh'),
				mimeType: 'video/mp4',
			});
			executeFunctionsMock.helpers.prepareBinaryData.mockResolvedValue({
				mimeType: 'video/mp4',
				fileName: 'video.mp4',
				fileSize: '1000',
				data: 'abcdefgh',
			});

			const promise = video.generate.execute.call(executeFunctionsMock, 0);
			await jest.advanceTimersByTimeAsync(5000);
			await jest.advanceTimersByTimeAsync(5000);
			const result = await promise;

			expect(result).toEqual([
				{
					binary: {
						data: {
							mimeType: 'video/mp4',
							fileName: 'video.mp4',
							fileSize: '1000',
							data: 'abcdefgh',
						},
					},
					json: {
						mimeType: 'video/mp4',
						fileName: 'video.mp4',
						fileSize: '1000',
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/models/veo-3.0-generate-002:predictLongRunning',
				{
					body: {
						instances: [
							{
								prompt: 'Panning wide shot of a calico kitten sleeping in the sunshine',
							},
						],
						parameters: {
							aspectRatio: '16:9',
							personGeneration: 'dont_allow',
							sampleCount: 1,
							durationSeconds: 8,
						},
					},
				},
			);
			expect(apiRequestMock).toHaveBeenCalledWith('GET', '/v1beta/operations/123');
			expect(pollCount).toBe(2);
			expect(downloadFileMock).toHaveBeenCalledWith('https://example.com/video.mp4', 'video/mp4', {
				key: 'test-api-key',
			});
		});

		it('should not pass durationSeconds if not provided', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/veo-3.0-generate-002';
					case 'prompt':
						return 'Panning wide shot of a calico kitten sleeping in the sunshine';
					case 'options':
						return {
							aspectRatio: '16:9',
							personGeneration: 'dont_allow',
							sampleCount: 1,
						};
					case 'returnAs':
						return 'url';
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getCredentials.mockResolvedValue({ apiKey: 'test-api-key' });
			apiRequestMock.mockResolvedValue({
				name: 'operations/123',
				done: true,
				response: {
					generateVideoResponse: {
						generatedSamples: [
							{
								video: {
									uri: 'https://example.com/video.mp4',
								},
							},
						],
					},
				},
			});

			const result = await video.generate.execute.call(executeFunctionsMock, 0);

			expect(result).toEqual([
				{
					json: {
						url: 'https://example.com/video.mp4',
					},
					pairedItem: { item: 0 },
				},
			]);
			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1beta/models/veo-3.0-generate-002:predictLongRunning',
				{
					body: {
						instances: [
							{
								prompt: 'Panning wide shot of a calico kitten sleeping in the sunshine',
							},
						],
						parameters: {
							aspectRatio: '16:9',
							personGeneration: 'dont_allow',
							sampleCount: 1,
						},
					},
				},
			);
		});

		it('should handle errors from video generation', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/veo-3.0-generate-002';
					case 'prompt':
						return 'Panning wide shot of a calico kitten sleeping in the sunshine';
					case 'options':
						return {};
					default:
						return undefined;
				}
			});
			executeFunctionsMock.getCredentials.mockResolvedValue({ apiKey: 'test-api-key' });
			apiRequestMock.mockImplementationOnce(async () => {
				return {
					name: 'operations/123',
					done: true,
					error: {
						message: 'Failed to generate video',
					},
				};
			});
			executeFunctionsMock.getNode.mockReturnValue({ name: 'Google Gemini' } as INode);

			await expect(video.generate.execute.call(executeFunctionsMock, 0)).rejects.toThrow(
				new NodeOperationError(executeFunctionsMock.getNode(), 'Failed to generate video', {
					description: 'Error generating video',
				}),
			);
		});

		it('should throw error for non-Veo model', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((parameter: string) => {
				switch (parameter) {
					case 'modelId':
						return 'models/gemini-2.0-flash';
					case 'prompt':
						return 'Panning wide shot of a calico kitten sleeping in the sunshine';
					default:
						return undefined;
				}
			});

			executeFunctionsMock.getNode.mockReturnValue({ name: 'Google Gemini' } as INode);

			await expect(video.generate.execute.call(executeFunctionsMock, 0)).rejects.toThrow(
				new NodeOperationError(
					executeFunctionsMock.getNode(),
					'Model models/gemini-2.0-flash is not supported for video generation. Please use a Veo model',
					{
						description: 'Video generation is only supported by Veo models',
					},
				),
			);
		});
	});
});
