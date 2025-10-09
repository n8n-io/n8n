import axios from 'axios';
import { mockDeep } from 'jest-mock-extended';
import type { IBinaryData, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { downloadFile, uploadFile, transferFile } from './utils';
import * as transport from '../transport';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GoogleGemini -> utils', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	const apiRequestMock = jest.spyOn(transport, 'apiRequest');

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers({ advanceTimers: true });
	});

	describe('downloadFile', () => {
		it('should download file', async () => {
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
				body: new ArrayBuffer(10),
				headers: {
					'content-type': 'application/pdf',
				},
			});

			const file = await downloadFile.call(mockExecuteFunctions, 'https://example.com/file.pdf');

			expect(file).toEqual({
				fileContent: Buffer.from(new ArrayBuffer(10)),
				mimeType: 'application/pdf',
			});
			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'GET',
				url: 'https://example.com/file.pdf',
				returnFullResponse: true,
				encoding: 'arraybuffer',
			});
		});

		it('should parse mime type from content type header', async () => {
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
				body: new ArrayBuffer(10),
				headers: {
					'content-type': 'application/pdf; q=0.9',
				},
			});

			const file = await downloadFile.call(mockExecuteFunctions, 'https://example.com/file.pdf');

			expect(file).toEqual({
				fileContent: Buffer.from(new ArrayBuffer(10)),
				mimeType: 'application/pdf',
			});
		});

		it('should use fallback mime type if content type header is not present', async () => {
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
				body: new ArrayBuffer(10),
				headers: {},
			});

			const file = await downloadFile.call(
				mockExecuteFunctions,
				'https://example.com/file.pdf',
				'application/pdf',
			);

			expect(file).toEqual({
				fileContent: Buffer.from(new ArrayBuffer(10)),
				mimeType: 'application/pdf',
			});
		});
	});

	describe('uploadFile', () => {
		it('should upload file', async () => {
			const fileContent = Buffer.from(new ArrayBuffer(10));
			const mimeType = 'application/pdf';

			apiRequestMock.mockResolvedValue({
				headers: {
					'x-goog-upload-url': 'https://google.com/some-upload-url',
				},
			});
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
				file: {
					name: 'files/test123',
					uri: 'https://google.com/files/test123',
					mimeType: 'application/pdf',
					state: 'ACTIVE',
				},
			});

			const file = await uploadFile.call(mockExecuteFunctions, fileContent, mimeType);

			expect(file).toEqual({
				fileUri: 'https://google.com/files/test123',
				mimeType: 'application/pdf',
			});
			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/upload/v1beta/files', {
				headers: {
					'X-Goog-Upload-Protocol': 'resumable',
					'X-Goog-Upload-Command': 'start',
					'X-Goog-Upload-Header-Content-Length': '10',
					'X-Goog-Upload-Header-Content-Type': 'application/pdf',
					'Content-Type': 'application/json',
				},
				option: {
					returnFullResponse: true,
				},
			});
			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: 'https://google.com/some-upload-url',
				headers: {
					'Content-Length': '10',
					'X-Goog-Upload-Offset': '0',
					'X-Goog-Upload-Command': 'upload, finalize',
				},
				body: fileContent,
			});
		});

		it('should throw error if file upload fails', async () => {
			const fileContent = Buffer.from(new ArrayBuffer(10));
			const mimeType = 'application/pdf';
			apiRequestMock.mockResolvedValue({
				headers: {
					'x-goog-upload-url': 'https://google.com/some-upload-url',
				},
			});
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
				file: {
					state: 'FAILED',
					error: {
						message: 'File upload failed',
					},
				},
			});

			await expect(uploadFile.call(mockExecuteFunctions, fileContent, mimeType)).rejects.toThrow(
				'File upload failed',
			);
		});

		it('should upload file when its not immediately active', async () => {
			const fileContent = Buffer.from(new ArrayBuffer(10));
			const mimeType = 'application/pdf';

			apiRequestMock.mockResolvedValueOnce({
				headers: {
					'x-goog-upload-url': 'https://google.com/some-upload-url',
				},
			});
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
				file: {
					name: 'files/test123',
					uri: 'https://google.com/files/test123',
					mimeType: 'application/pdf',
					state: 'PENDING',
				},
			});
			apiRequestMock.mockResolvedValueOnce({
				name: 'files/test123',
				uri: 'https://google.com/files/test123',
				mimeType: 'application/pdf',
				state: 'ACTIVE',
			});

			const promise = uploadFile.call(mockExecuteFunctions, fileContent, mimeType);
			await jest.advanceTimersByTimeAsync(1000);
			const file = await promise;

			expect(file).toEqual({
				fileUri: 'https://google.com/files/test123',
				mimeType: 'application/pdf',
			});
			expect(apiRequestMock).toHaveBeenCalledWith('GET', '/v1beta/files/test123');
		});

		it('should poll until file is active', async () => {
			const fileContent = Buffer.from('test file content');
			const mimeType = 'application/pdf';

			apiRequestMock.mockResolvedValueOnce({
				headers: {
					'x-goog-upload-url': 'https://upload.googleapis.com/upload/123',
				},
			});

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce({
				file: {
					name: 'files/abc123',
					uri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
					mimeType: 'application/pdf',
					state: 'PROCESSING',
				},
			});

			apiRequestMock
				.mockResolvedValueOnce({
					name: 'files/abc123',
					uri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
					mimeType: 'application/pdf',
					state: 'PROCESSING',
				})
				.mockResolvedValueOnce({
					name: 'files/abc123',
					uri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
					mimeType: 'application/pdf',
					state: 'ACTIVE',
				});

			jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
				callback();
				return {} as any;
			});

			const result = await uploadFile.call(mockExecuteFunctions, fileContent, mimeType);

			expect(result).toEqual({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'application/pdf',
			});

			expect(apiRequestMock).toHaveBeenCalledWith('GET', '/v1beta/files/abc123');
		});

		it('should throw error when upload fails', async () => {
			const fileContent = Buffer.from('test file content');
			const mimeType = 'application/pdf';

			apiRequestMock.mockResolvedValueOnce({
				headers: {
					'x-goog-upload-url': 'https://upload.googleapis.com/upload/123',
				},
			});

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce({
				file: {
					name: 'files/abc123',
					uri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
					mimeType: 'application/pdf',
					state: 'FAILED',
					error: { message: 'Upload failed' },
				},
			});

			mockExecuteFunctions.getNode.mockReturnValue({ name: 'Google Gemini' } as any);

			await expect(uploadFile.call(mockExecuteFunctions, fileContent, mimeType)).rejects.toThrow(
				new NodeOperationError(mockExecuteFunctions.getNode(), 'Upload failed', {
					description: 'Error uploading file',
				}),
			);
		});
	});

	describe('transferFile', () => {
		it('should transfer file from URL using axios', async () => {
			const mockStream = {
				pipe: jest.fn(),
				on: jest.fn(),
			} as any;

			mockedAxios.get.mockResolvedValue({
				data: mockStream,
				headers: {
					'content-type': 'application/pdf; charset=utf-8',
				},
			});

			apiRequestMock.mockResolvedValueOnce({
				headers: {
					'x-goog-upload-url': 'https://upload.googleapis.com/upload/123',
				},
			});

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce({
				body: {
					file: {
						name: 'files/abc123',
						uri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
						mimeType: 'application/pdf',
						state: 'ACTIVE',
					},
				},
			});

			const result = await transferFile.call(
				mockExecuteFunctions,
				0,
				'https://example.com/file.pdf',
				'application/octet-stream',
			);

			expect(result).toEqual({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'application/pdf',
			});

			expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/file.pdf', {
				params: undefined,
				responseType: 'stream',
			});

			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/upload/v1beta/files', {
				headers: {
					'X-Goog-Upload-Protocol': 'resumable',
					'X-Goog-Upload-Command': 'start',
					'X-Goog-Upload-Header-Content-Type': 'application/pdf',
					'Content-Type': 'application/json',
				},
				option: { returnFullResponse: true },
			});

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: 'https://upload.googleapis.com/upload/123',
				headers: {
					'X-Goog-Upload-Offset': '0',
					'X-Goog-Upload-Command': 'upload, finalize',
					'Content-Type': 'application/pdf',
				},
				body: mockStream,
				returnFullResponse: true,
			});
		});

		it('should transfer file from binary data without id', async () => {
			const mockBinaryData: IBinaryData = {
				mimeType: 'application/pdf',
				fileName: 'test.pdf',
				fileSize: '1024',
				fileExtension: 'pdf',
				data: 'test',
			};

			mockExecuteFunctions.getNodeParameter.mockReturnValue('data');
			mockExecuteFunctions.helpers.assertBinaryData.mockReturnValue(mockBinaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('test'));

			apiRequestMock.mockResolvedValueOnce({
				headers: {
					'x-goog-upload-url': 'https://upload.googleapis.com/upload/123',
				},
			});

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce({
				file: {
					name: 'files/abc123',
					uri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
					mimeType: 'application/pdf',
					state: 'ACTIVE',
				},
			});

			const result = await transferFile.call(
				mockExecuteFunctions,
				0,
				undefined,
				'application/octet-stream',
			);

			expect(result).toEqual({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'application/pdf',
			});

			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
			expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
		});

		it('should transfer file from binary data with id using stream', async () => {
			const mockBinaryData: IBinaryData = {
				id: 'binary-123',
				mimeType: 'application/pdf',
				fileName: 'test.pdf',
				fileSize: '1024',
				fileExtension: 'pdf',
				data: 'test',
			};

			const mockStream = {
				pipe: jest.fn(),
				on: jest.fn(),
			} as any;

			mockExecuteFunctions.getNodeParameter.mockReturnValue('data');
			mockExecuteFunctions.helpers.assertBinaryData.mockReturnValue(mockBinaryData);
			mockExecuteFunctions.helpers.getBinaryStream.mockResolvedValue(mockStream);

			apiRequestMock.mockResolvedValueOnce({
				headers: {
					'x-goog-upload-url': 'https://upload.googleapis.com/upload/123',
				},
			});

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce({
				body: {
					file: {
						name: 'files/abc123',
						uri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
						mimeType: 'application/pdf',
						state: 'ACTIVE',
					},
				},
			});

			const result = await transferFile.call(
				mockExecuteFunctions,
				0,
				undefined,
				'application/octet-stream',
			);

			expect(result).toEqual({
				fileUri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'application/pdf',
			});

			expect(mockExecuteFunctions.helpers.getBinaryStream).toHaveBeenCalledWith(
				'binary-123',
				262144,
			);
		});

		it('should throw error when binary property name is missing', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('');
			mockExecuteFunctions.getNode.mockReturnValue({ name: 'Google Gemini' } as any);

			await expect(
				transferFile.call(mockExecuteFunctions, 0, undefined, 'application/octet-stream'),
			).rejects.toThrow(
				new NodeOperationError(mockExecuteFunctions.getNode(), 'Binary property name is required', {
					description: 'Error uploading file',
				}),
			);
		});

		it('should throw error when upload URL is not received', async () => {
			const mockStream = {
				pipe: jest.fn(),
				on: jest.fn(),
			} as any;

			mockedAxios.get.mockResolvedValue({
				data: mockStream,
				headers: {
					'content-type': 'application/pdf',
				},
			});

			apiRequestMock.mockResolvedValueOnce({
				headers: {},
			});

			mockExecuteFunctions.getNode.mockReturnValue({ name: 'Google Gemini' } as any);

			await expect(
				transferFile.call(
					mockExecuteFunctions,
					0,
					'https://example.com/file.pdf',
					'application/octet-stream',
				),
			).rejects.toThrow(
				new NodeOperationError(mockExecuteFunctions.getNode(), 'Failed to get upload URL'),
			);
		});

		it('should poll until file is active and throw error on failure', async () => {
			const mockStream = {
				pipe: jest.fn(),
				on: jest.fn(),
			} as any;

			mockedAxios.get.mockResolvedValue({
				data: mockStream,
				headers: {
					'content-type': 'application/pdf',
				},
			});

			apiRequestMock.mockResolvedValueOnce({
				headers: {
					'x-goog-upload-url': 'https://upload.googleapis.com/upload/123',
				},
			});

			mockExecuteFunctions.helpers.httpRequest.mockResolvedValueOnce({
				body: {
					file: {
						name: 'files/abc123',
						uri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
						mimeType: 'application/pdf',
						state: 'PROCESSING',
					},
				},
			});

			apiRequestMock.mockResolvedValueOnce({
				name: 'files/abc123',
				uri: 'https://generativelanguage.googleapis.com/v1/files/abc123',
				mimeType: 'application/pdf',
				state: 'FAILED',
				error: { message: 'Processing failed' },
			});

			jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
				callback();
				return {} as any;
			});

			mockExecuteFunctions.getNode.mockReturnValue({ name: 'Google Gemini' } as any);

			await expect(
				transferFile.call(
					mockExecuteFunctions,
					0,
					'https://example.com/file.pdf',
					'application/octet-stream',
				),
			).rejects.toThrow(
				new NodeOperationError(mockExecuteFunctions.getNode(), 'Processing failed', {
					description: 'Error uploading file',
				}),
			);
		});
	});
});
