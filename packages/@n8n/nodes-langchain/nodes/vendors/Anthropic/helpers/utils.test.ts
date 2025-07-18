import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { downloadFile, getBaseUrl, getMimeType, splitByComma, uploadFile } from './utils';
import * as transport from '../transport';

describe('Anthropic -> utils', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	const apiRequestMock = jest.spyOn(transport, 'apiRequest');

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('getMimeType', () => {
		it('should extract mime type from content type string', () => {
			const result = getMimeType('application/pdf; q=0.9');
			expect(result).toBe('application/pdf');
		});

		it('should return full string if no semicolon', () => {
			const result = getMimeType('application/pdf');
			expect(result).toBe('application/pdf');
		});

		it('should return undefined for undefined input', () => {
			const result = getMimeType(undefined);
			expect(result).toBeUndefined();
		});

		it('should handle empty string', () => {
			const result = getMimeType('');
			expect(result).toBe('');
		});
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

		it('should use fallback mime type if content type header is not present', async () => {
			mockExecuteFunctions.helpers.httpRequest.mockResolvedValue({
				body: new ArrayBuffer(10),
				headers: {},
			});

			const file = await downloadFile.call(mockExecuteFunctions, 'https://example.com/file.pdf');

			expect(file).toEqual({
				fileContent: Buffer.from(new ArrayBuffer(10)),
				mimeType: 'application/octet-stream',
			});
		});
	});

	describe('uploadFile', () => {
		it('should upload file', async () => {
			const fileContent = Buffer.from('test file content');
			const mimeType = 'text/plain';
			const fileName = 'test.txt';

			apiRequestMock.mockResolvedValue({
				created_at: '2025-01-01T10:00:00Z',
				downloadable: true,
				filename: fileName,
				id: 'file_123',
				mime_type: mimeType,
				size_bytes: fileContent.length,
				type: 'file',
			});

			const result = await uploadFile.call(mockExecuteFunctions, fileContent, mimeType, fileName);

			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/v1/files', {
				headers: expect.objectContaining({
					'content-type': expect.stringContaining('multipart/form-data'),
				}),
				body: expect.any(Object),
			});
			expect(result).toEqual({
				created_at: '2025-01-01T10:00:00Z',
				downloadable: true,
				filename: fileName,
				id: 'file_123',
				mime_type: mimeType,
				size_bytes: fileContent.length,
				type: 'file',
			});
		});

		it('should upload file with default filename when not provided', async () => {
			const fileContent = Buffer.from('test file content');
			const mimeType = 'application/pdf';

			apiRequestMock.mockResolvedValue({
				created_at: '2025-01-01T10:00:00Z',
				downloadable: true,
				filename: 'file',
				id: 'file_456',
				mime_type: mimeType,
				size_bytes: fileContent.length,
				type: 'file',
			});

			const result = await uploadFile.call(mockExecuteFunctions, fileContent, mimeType);

			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/v1/files', {
				headers: expect.objectContaining({
					'content-type': expect.stringContaining('multipart/form-data'),
				}),
				body: expect.any(Object),
			});
			expect(result).toEqual({
				created_at: '2025-01-01T10:00:00Z',
				downloadable: true,
				filename: 'file',
				id: 'file_456',
				mime_type: mimeType,
				size_bytes: fileContent.length,
				type: 'file',
			});
		});
	});

	describe('splitByComma', () => {
		it('should split string by comma and trim', () => {
			const result = splitByComma('apple, banana, cherry');
			expect(result).toEqual(['apple', 'banana', 'cherry']);
		});

		it('should handle string with extra spaces', () => {
			const result = splitByComma('  apple  ,  banana  ,  cherry  ');
			expect(result).toEqual(['apple', 'banana', 'cherry']);
		});

		it('should filter out empty strings', () => {
			const result = splitByComma('apple,, banana, , cherry,');
			expect(result).toEqual(['apple', 'banana', 'cherry']);
		});

		it('should handle single item', () => {
			const result = splitByComma('apple');
			expect(result).toEqual(['apple']);
		});

		it('should handle empty string', () => {
			const result = splitByComma('');
			expect(result).toEqual([]);
		});

		it('should handle string with only commas and spaces', () => {
			const result = splitByComma(' , , , ');
			expect(result).toEqual([]);
		});
	});

	describe('getBaseUrl', () => {
		it('should return custom URL from credentials', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				url: 'https://custom-anthropic-api.com',
			});

			const result = await getBaseUrl.call(mockExecuteFunctions);

			expect(result).toBe('https://custom-anthropic-api.com');
			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('anthropicApi');
		});

		it('should return default URL when no custom URL in credentials', async () => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({});

			const result = await getBaseUrl.call(mockExecuteFunctions);

			expect(result).toBe('https://api.anthropic.com');
		});
	});
});
