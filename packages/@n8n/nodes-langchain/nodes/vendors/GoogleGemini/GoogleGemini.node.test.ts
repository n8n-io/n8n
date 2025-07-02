import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, IBinaryData } from 'n8n-workflow';

import * as helpers from '@utils/helpers';

import * as audio from './actions/audio';
import * as text from './actions/text';
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
								functionDeclarations: [],
							},
							{
								code_execution: {},
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
				mimeType: 'audio/mp3',
			});
			uploadFileMock.mockResolvedValue({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'audio/mp3',
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
			expect(downloadFileMock).toHaveBeenCalledWith('https://example.com/audio.mp3', 'audio/mp3');
			expect(uploadFileMock).toHaveBeenCalledWith(Buffer.from('test'), 'audio/mp3');
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
											mimeType: 'audio/mp3',
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
				mimeType: 'audio/mp3',
				fileName: 'test.mp3',
				fileSize: '1024',
				fileExtension: 'mp3',
				data: 'test',
			};
			executeFunctionsMock.helpers.assertBinaryData.mockReturnValue(mockBinaryData);
			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('test'));
			uploadFileMock.mockResolvedValue({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'audio/mp3',
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
			expect(uploadFileMock).toHaveBeenCalledWith(Buffer.from('test'), 'audio/mp3');
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
											mimeType: 'audio/mp3',
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

			apiRequestMock.mockImplementation((method: string) => {
				if (method === 'GET') {
					return Promise.resolve({ mimeType: 'audio/mp3' });
				}
				return Promise.resolve({
					candidates: [
						{
							content: {
								parts: [{ text: 'This audio contains a person speaking about AI.' }],
								role: 'model',
							},
						},
					],
				});
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
				option: { uri: 'https://generativelanguage.googleapis.com/v1/files/abc123' },
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
											mimeType: 'audio/mp3',
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
				mimeType: 'audio/mp3',
			});
			uploadFileMock.mockResolvedValue({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'audio/mp3',
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
			expect(uploadFileMock).toHaveBeenCalledWith(Buffer.from('test'), 'audio/mp3');
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
											mimeType: 'audio/mp3',
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
				mimeType: 'audio/mp3',
				fileName: 'test.mp3',
				fileSize: '1024',
				fileExtension: 'mp3',
				data: 'test',
			};
			executeFunctionsMock.helpers.assertBinaryData.mockReturnValue(mockBinaryData);
			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('test'));
			uploadFileMock.mockResolvedValue({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'audio/mp3',
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
			expect(uploadFileMock).toHaveBeenCalledWith(Buffer.from('test'), 'audio/mp3');
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
											mimeType: 'audio/mp3',
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

			apiRequestMock.mockImplementation((method: string) => {
				if (method === 'GET') {
					return Promise.resolve({ mimeType: 'audio/mp3' });
				}
				return Promise.resolve({
					candidates: [
						{
							content: {
								parts: [{ text: 'This is the transcribed text from 00:15 to 02:15.' }],
								role: 'model',
							},
						},
					],
				});
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
				option: { uri: 'https://generativelanguage.googleapis.com/v1/files/abc123' },
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
											mimeType: 'audio/mp3',
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
});
