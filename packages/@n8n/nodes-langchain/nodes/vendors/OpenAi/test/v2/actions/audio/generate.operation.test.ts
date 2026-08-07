import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as transport from '../../../../transport';
import { execute } from '../../../../v2/actions/audio/generate.operation';

jest.mock('../../../../transport');

describe('Audio Generate Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;
	const apiRequestSpy = jest.spyOn(transport, 'apiRequest');

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'OpenAI Audio Generate',
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

	describe('basic audio generation', () => {
		it('should generate audio with required parameters only', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'tts-1',
					input: 'Hello world',
					voice: 'alloy',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockAudioData = Buffer.from('mock-audio-data');
			const mockBinaryData = {
				data: 'base64-encoded-audio',
				mimeType: 'audio/mp3',
				fileName: 'audio.mp3',
			};

			apiRequestSpy.mockResolvedValueOnce(mockAudioData);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result).toEqual([
				{
					json: {
						...mockBinaryData,
						data: undefined,
					},
					pairedItem: { item: 0 },
					binary: {
						data: mockBinaryData,
					},
				},
			]);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/audio/speech', {
				body: {
					model: 'tts-1',
					input: 'Hello world',
					voice: 'alloy',
					response_format: 'mp3',
					speed: 1,
				},
				option: {
					useStream: true,
					returnFullResponse: true,
					encoding: 'arraybuffer',
					json: false,
				},
			});
		});

		it('should generate audio with tts-1-hd model', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'tts-1-hd',
					input: 'Test input',
					voice: 'echo',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
				data: 'base64',
				mimeType: 'audio/mp3',
			});

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/audio/speech',
				expect.objectContaining({
					body: expect.objectContaining({
						model: 'tts-1-hd',
					}),
				}),
			);
		});

		it('should generate audio with gpt-4o-mini-tts model', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-4o-mini-tts',
					input: 'Test input',
					voice: 'ash',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
				data: 'base64',
				mimeType: 'audio/mp3',
			});

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/audio/speech',
				expect.objectContaining({
					body: expect.objectContaining({
						model: 'gpt-4o-mini-tts',
					}),
				}),
			);
		});
	});

	describe('voice options', () => {
		describe('common voices (all models)', () => {
			it.each(['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'])(
				'should support %s voice with tts-1',
				async (voice) => {
					mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
						const params = {
							model: 'tts-1',
							input: 'Test',
							voice,
							options: {},
						};
						return params[paramName as keyof typeof params];
					});

					apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
					(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
						data: 'base64',
						mimeType: 'audio/mp3',
					});

					await execute.call(mockExecuteFunctions, 0);

					expect(apiRequestSpy).toHaveBeenCalledWith(
						'POST',
						'/audio/speech',
						expect.objectContaining({
							body: expect.objectContaining({
								voice,
							}),
						}),
					);
				},
			);

			it.each(['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'])(
				'should support %s voice with gpt-4o-mini-tts',
				async (voice) => {
					mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
						const params = {
							model: 'gpt-4o-mini-tts',
							input: 'Test',
							voice,
							options: {},
						};
						return params[paramName as keyof typeof params];
					});

					apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
					(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
						data: 'base64',
						mimeType: 'audio/mp3',
					});

					await execute.call(mockExecuteFunctions, 0);

					expect(apiRequestSpy).toHaveBeenCalledWith(
						'POST',
						'/audio/speech',
						expect.objectContaining({
							body: expect.objectContaining({
								voice,
							}),
						}),
					);
				},
			);
		});

		describe('gpt-4o-mini-tts exclusive voices', () => {
			it.each(['ballad', 'verse'])(
				'should support %s voice with gpt-4o-mini-tts',
				async (voice) => {
					mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
						const params = {
							model: 'gpt-4o-mini-tts',
							input: 'Test',
							voice,
							options: {},
						};
						return params[paramName as keyof typeof params];
					});

					apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
					(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
						data: 'base64',
						mimeType: 'audio/mp3',
					});

					await execute.call(mockExecuteFunctions, 0);

					expect(apiRequestSpy).toHaveBeenCalledWith(
						'POST',
						'/audio/speech',
						expect.objectContaining({
							body: expect.objectContaining({
								voice,
							}),
						}),
					);
				},
			);
		});
	});

	describe('response format options', () => {
		it.each(['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'])(
			'should support %s format',
			async (format) => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params = {
						model: 'tts-1',
						input: 'Test',
						voice: 'alloy',
						options: {
							response_format: format,
						},
					};
					return params[paramName as keyof typeof params];
				});

				apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
				(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
					data: 'base64',
					mimeType: `audio/${format}`,
					fileName: `audio.${format}`,
				});

				await execute.call(mockExecuteFunctions, 0);

				expect(apiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/audio/speech',
					expect.objectContaining({
						body: expect.objectContaining({
							response_format: format,
						}),
					}),
				);

				expect(mockExecuteFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
					expect.anything(),
					`audio.${format}`,
					`audio/${format}`,
				);
			},
		);
	});

	describe('speed option', () => {
		it('should set custom speed', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'tts-1',
					input: 'Test',
					voice: 'alloy',
					options: {
						speed: 1.5,
					},
				};
				return params[paramName as keyof typeof params];
			});

			apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
				data: 'base64',
				mimeType: 'audio/mp3',
			});

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/audio/speech',
				expect.objectContaining({
					body: expect.objectContaining({
						speed: 1.5,
					}),
				}),
			);
		});
	});

	describe('instructions parameter', () => {
		it('should include instructions when provided with gpt-4o-mini-tts', async () => {
			const instructions = 'Speak like a friendly customer service agent';
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-4o-mini-tts',
					input: 'Hello, how can I help you today?',
					voice: 'alloy',
					options: {
						instructions,
					},
				};
				return params[paramName as keyof typeof params];
			});

			apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
				data: 'base64',
				mimeType: 'audio/mp3',
			});

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/audio/speech',
				expect.objectContaining({
					body: expect.objectContaining({
						instructions,
					}),
				}),
			);
		});

		it('should not include instructions when not provided', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-4o-mini-tts',
					input: 'Test',
					voice: 'alloy',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
				data: 'base64',
				mimeType: 'audio/mp3',
			});

			await execute.call(mockExecuteFunctions, 0);

			const callArgs = apiRequestSpy.mock.calls[0][2];
			expect(callArgs?.body).not.toHaveProperty('instructions');
		});
	});

	describe('stream_format parameter', () => {
		it('should include stream_format when set to sse', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-4o-mini-tts',
					input: 'Test',
					voice: 'alloy',
					options: {
						stream_format: 'sse',
					},
				};
				return params[paramName as keyof typeof params];
			});

			apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
				data: 'base64',
				mimeType: 'audio/mp3',
			});

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/audio/speech',
				expect.objectContaining({
					body: expect.objectContaining({
						stream_format: 'sse',
					}),
				}),
			);
		});

		it('should include stream_format when set to audio', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-4o-mini-tts',
					input: 'Test',
					voice: 'alloy',
					options: {
						stream_format: 'audio',
					},
				};
				return params[paramName as keyof typeof params];
			});

			apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
				data: 'base64',
				mimeType: 'audio/mp3',
			});

			await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/audio/speech',
				expect.objectContaining({
					body: expect.objectContaining({
						stream_format: 'audio',
					}),
				}),
			);
		});

		it('should not include stream_format when not provided', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'tts-1',
					input: 'Test',
					voice: 'alloy',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue({
				data: 'base64',
				mimeType: 'audio/mp3',
			});

			await execute.call(mockExecuteFunctions, 0);

			const callArgs = apiRequestSpy.mock.calls[0][2];
			expect(callArgs?.body).not.toHaveProperty('stream_format');
		});
	});

	describe('custom binary output field', () => {
		it('should use custom binary property output name', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'tts-1',
					input: 'Test',
					voice: 'alloy',
					options: {
						binaryPropertyOutput: 'myAudio',
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryData = {
				data: 'base64',
				mimeType: 'audio/mp3',
			};

			apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(result[0].binary).toHaveProperty('myAudio');
			expect(result[0].binary?.myAudio).toEqual(mockBinaryData);
		});
	});

	describe('complex scenarios', () => {
		it('should handle all optional parameters together', async () => {
			const instructions = 'Speak dramatically';
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					model: 'gpt-4o-mini-tts',
					input: 'The quick brown fox jumps over the lazy dog',
					voice: 'ballad',
					options: {
						response_format: 'flac',
						speed: 0.75,
						instructions,
						stream_format: 'sse',
						binaryPropertyOutput: 'audioFile',
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryData = {
				data: 'base64',
				mimeType: 'audio/flac',
				fileName: 'audio.flac',
			};

			apiRequestSpy.mockResolvedValueOnce(Buffer.from('mock-audio'));
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/audio/speech', {
				body: {
					model: 'gpt-4o-mini-tts',
					input: 'The quick brown fox jumps over the lazy dog',
					voice: 'ballad',
					response_format: 'flac',
					speed: 0.75,
					instructions,
					stream_format: 'sse',
				},
				option: {
					useStream: true,
					returnFullResponse: true,
					encoding: 'arraybuffer',
					json: false,
				},
			});

			expect(result[0].binary).toHaveProperty('audioFile');
			expect(result[0].binary?.audioFile).toEqual(mockBinaryData);
		});
	});
});
