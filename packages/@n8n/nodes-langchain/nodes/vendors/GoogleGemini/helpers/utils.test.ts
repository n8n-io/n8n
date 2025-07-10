import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { downloadFile, uploadFile } from './utils';
import * as transport from '../transport';

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
	});
});
