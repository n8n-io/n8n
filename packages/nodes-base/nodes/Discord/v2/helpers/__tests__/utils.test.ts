import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';
import { getAuditLogReasonHeaders, prepareEmbeds, prepareMultiPartForm } from '../utils';

describe('Discord V2 Utils', () => {
	describe('prepareMultiPartForm', () => {
		let mockExecuteFunctions: IExecuteFunctions;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		});

		afterEach(() => {
			vi.resetAllMocks();
		});

		it('should create multipart form with single file', async () => {
			const files: IDataObject[] = [{ inputFieldName: 'file1' }];
			const jsonPayload: IDataObject = { content: 'Test message' };
			const itemIndex = 0;

			const binaryData = {
				data: 'base64data',
				mimeType: 'image/png',
				fileName: 'test.png',
				fileExtension: 'png',
			};

			mockExecuteFunctions.helpers.assertBinaryData = vi.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = vi
				.fn()
				.mockResolvedValue(Buffer.from('test file content'));
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: 'Discord' });

			const result = await prepareMultiPartForm.call(
				mockExecuteFunctions,
				files,
				jsonPayload,
				itemIndex,
			);

			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'file1');
			expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'file1');
			expect(result).toBeDefined();
		});

		it('should create multipart form with multiple files', async () => {
			const files: IDataObject[] = [{ inputFieldName: 'file1' }, { inputFieldName: 'file2' }];
			const jsonPayload: IDataObject = { content: 'Test message with multiple files' };
			const itemIndex = 0;

			const binaryData1 = {
				data: 'base64data1',
				mimeType: 'image/png',
				fileName: 'test1.png',
				fileExtension: 'png',
			};

			const binaryData2 = {
				data: 'base64data2',
				mimeType: 'image/jpeg',
				fileName: 'test2.jpg',
				fileExtension: 'jpg',
			};

			mockExecuteFunctions.helpers.assertBinaryData = vi
				.fn()
				.mockReturnValueOnce(binaryData1)
				.mockReturnValueOnce(binaryData2);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = vi
				.fn()
				.mockResolvedValueOnce(Buffer.from('test file content 1'))
				.mockResolvedValueOnce(Buffer.from('test file content 2'));
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: 'Discord' });

			const result = await prepareMultiPartForm.call(
				mockExecuteFunctions,
				files,
				jsonPayload,
				itemIndex,
			);

			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledTimes(2);
			expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledTimes(2);
			expect(result).toBeDefined();
		});

		it('should add file extension from fileExtension property when filename has no extension', async () => {
			const files: IDataObject[] = [{ inputFieldName: 'file1' }];
			const jsonPayload: IDataObject = { content: 'Test message' };
			const itemIndex = 0;

			const binaryData = {
				data: 'base64data',
				mimeType: 'image/png',
				fileName: 'testfile',
				fileExtension: 'png',
			};

			mockExecuteFunctions.helpers.assertBinaryData = vi.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = vi
				.fn()
				.mockResolvedValue(Buffer.from('test file content'));
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: 'Discord' });

			const result = await prepareMultiPartForm.call(
				mockExecuteFunctions,
				files,
				jsonPayload,
				itemIndex,
			);

			expect(result).toBeDefined();
		});

		it('should add file extension from mimeType when filename has no extension and fileExtension is missing', async () => {
			const files: IDataObject[] = [{ inputFieldName: 'file1' }];
			const jsonPayload: IDataObject = { content: 'Test message' };
			const itemIndex = 0;

			const binaryData = {
				data: 'base64data',
				mimeType: 'image/jpeg',
				fileName: 'testfile',
			};

			mockExecuteFunctions.helpers.assertBinaryData = vi.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = vi
				.fn()
				.mockResolvedValue(Buffer.from('test file content'));
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: 'Discord' });

			const result = await prepareMultiPartForm.call(
				mockExecuteFunctions,
				files,
				jsonPayload,
				itemIndex,
			);

			expect(result).toBeDefined();
		});

		it('should throw error when binary data is not found', async () => {
			const files: IDataObject[] = [{ inputFieldName: 'file1' }];
			const jsonPayload: IDataObject = { content: 'Test message' };
			const itemIndex = 0;

			mockExecuteFunctions.helpers.assertBinaryData = vi.fn().mockReturnValue(null);
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: 'Discord' });

			await expect(
				prepareMultiPartForm.call(mockExecuteFunctions, files, jsonPayload, itemIndex),
			).rejects.toThrow(NodeOperationError);

			await expect(
				prepareMultiPartForm.call(mockExecuteFunctions, files, jsonPayload, itemIndex),
			).rejects.toThrow('Input item [0] does not contain binary data on property file1');
		});

		it('should handle file with complete filename including extension', async () => {
			const files: IDataObject[] = [{ inputFieldName: 'file1' }];
			const jsonPayload: IDataObject = { content: 'Test message' };
			const itemIndex = 0;

			const binaryData = {
				data: 'base64data',
				mimeType: 'application/pdf',
				fileName: 'document.pdf',
				fileExtension: 'pdf',
			};

			mockExecuteFunctions.helpers.assertBinaryData = vi.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = vi
				.fn()
				.mockResolvedValue(Buffer.from('pdf content'));
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: 'Discord' });

			const result = await prepareMultiPartForm.call(
				mockExecuteFunctions,
				files,
				jsonPayload,
				itemIndex,
			);

			expect(result).toBeDefined();
		});

		it('should include attachments in payload_json with correct structure', async () => {
			const files: IDataObject[] = [{ inputFieldName: 'file1' }, { inputFieldName: 'file2' }];
			const jsonPayload: IDataObject = { content: 'Test with attachments' };
			const itemIndex = 0;

			const binaryData1 = {
				data: 'base64data1',
				mimeType: 'image/png',
				fileName: 'image1.png',
			};

			const binaryData2 = {
				data: 'base64data2',
				mimeType: 'text/plain',
				fileName: 'text.txt',
			};

			mockExecuteFunctions.helpers.assertBinaryData = vi
				.fn()
				.mockReturnValueOnce(binaryData1)
				.mockReturnValueOnce(binaryData2);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = vi
				.fn()
				.mockResolvedValueOnce(Buffer.from('image content'))
				.mockResolvedValueOnce(Buffer.from('text content'));
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: 'Discord' });

			const result = await prepareMultiPartForm.call(
				mockExecuteFunctions,
				files,
				jsonPayload,
				itemIndex,
			);

			expect(result).toBeDefined();

			const payloadJsonField = result
				.getBuffer()
				.toString()
				.match(
					/Content-Disposition: form-data; name="payload_json"[\s\S]*?\r\n\r\n([\s\S]*?)\r\n--/,
				);
			expect(payloadJsonField).not.toBeNull();

			const payloadJson = jsonParse<{
				content: string;
				attachments: Array<{ id: number; filename: string }>;
			}>(payloadJsonField![1]);

			expect(payloadJson.content).toBe('Test with attachments');

			expect(payloadJson.attachments).toBeDefined();
			expect(Array.isArray(payloadJson.attachments)).toBe(true);
			expect(payloadJson.attachments).toHaveLength(2);

			expect(payloadJson.attachments[0]).toEqual({
				id: 0,
				filename: 'image1.png',
			});

			expect(payloadJson.attachments[1]).toEqual({
				id: 1,
				filename: 'text.txt',
			});
		});

		it('should use filename as filename and mimeType as content-type in file parts', async () => {
			const files: IDataObject[] = [{ inputFieldName: 'document' }];
			const jsonPayload: IDataObject = { content: 'Test' };
			const itemIndex = 0;

			const binaryData = {
				data: 'base64data',
				mimeType: 'application/pdf',
				fileName: 'report.pdf',
				fileExtension: 'pdf',
			};

			mockExecuteFunctions.helpers.assertBinaryData = vi.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = vi
				.fn()
				.mockResolvedValue(Buffer.from('pdf content'));
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: 'Discord' });

			const result = await prepareMultiPartForm.call(
				mockExecuteFunctions,
				files,
				jsonPayload,
				itemIndex,
			);

			const body = result.getBuffer().toString();

			// File part should have the actual filename, not the mime type
			expect(body).toContain('filename="report.pdf"');
			// File part should have the actual mime type, not the filename
			expect(body).toContain('Content-Type: application/pdf');
			// Sanity check: the values must not be swapped
			expect(body).not.toContain('filename="application/pdf"');
			expect(body).not.toContain('Content-Type: report.pdf');
		});

		it('should handle empty files array', async () => {
			const files: IDataObject[] = [];
			const jsonPayload: IDataObject = { content: 'Test message no files' };
			const itemIndex = 0;

			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: 'Discord' });

			const result = await prepareMultiPartForm.call(
				mockExecuteFunctions,
				files,
				jsonPayload,
				itemIndex,
			);

			expect(result).toBeDefined();
		});

		it('should properly format filename when only mimeType is available', async () => {
			const files: IDataObject[] = [{ inputFieldName: 'file1' }];
			const jsonPayload: IDataObject = { content: 'Test message' };
			const itemIndex = 0;

			const binaryData = {
				data: 'base64data',
				mimeType: 'application/json',
				fileName: 'data',
			};

			mockExecuteFunctions.helpers.assertBinaryData = vi.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = vi
				.fn()
				.mockResolvedValue(Buffer.from('json content'));
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: 'Discord' });

			const result = await prepareMultiPartForm.call(
				mockExecuteFunctions,
				files,
				jsonPayload,
				itemIndex,
			);

			expect(result).toBeDefined();
		});

		it('should handle different item indices correctly', async () => {
			const files: IDataObject[] = [{ inputFieldName: 'file1' }];
			const jsonPayload: IDataObject = { content: 'Test message' };
			const itemIndex = 2;

			const binaryData = {
				data: 'base64data',
				mimeType: 'image/png',
				fileName: 'test.png',
			};

			mockExecuteFunctions.helpers.assertBinaryData = vi.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = vi
				.fn()
				.mockResolvedValue(Buffer.from('test file content'));
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: 'Discord' });

			const result = await prepareMultiPartForm.call(
				mockExecuteFunctions,
				files,
				jsonPayload,
				itemIndex,
			);

			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(2, 'file1');
			expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(2, 'file1');
			expect(result).toBeDefined();
		});
	});

	describe('prepareEmbeds', () => {
		let mockExecuteFunctions: IExecuteFunctions;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			mockExecuteFunctions.getNode = vi.fn().mockReturnValue({ name: 'Discord' });
		});

		afterEach(() => {
			vi.resetAllMocks();
		});

		it('should build an embed from form fields, dropping empty string values', () => {
			const embeds: IDataObject[] = [
				{
					inputMethod: 'fields',
					title: 'Hello',
					description: '',
					url: 'https://example.com',
				},
			];

			const result = prepareEmbeds.call(mockExecuteFunctions, embeds);

			expect(result).toEqual([{ title: 'Hello', url: 'https://example.com' }]);
		});

		it('should convert a string author into an author object', () => {
			const embeds: IDataObject[] = [
				{
					inputMethod: 'fields',
					author: 'Jane Doe',
				},
			];

			const result = prepareEmbeds.call(mockExecuteFunctions, embeds);

			expect(result).toEqual([{ author: { name: 'Jane Doe' } }]);
		});

		it('should convert a hex color string into a decimal integer', () => {
			const embeds: IDataObject[] = [
				{
					inputMethod: 'fields',
					color: '#FF0000',
				},
			];

			const result = prepareEmbeds.call(mockExecuteFunctions, embeds);

			expect(result).toEqual([{ color: 16711680 }]);
		});

		it('should wrap a video URL string into a video object with default dimensions', () => {
			const embeds: IDataObject[] = [
				{
					inputMethod: 'fields',
					video: 'https://example.com/video.mp4',
				},
			];

			const result = prepareEmbeds.call(mockExecuteFunctions, embeds);

			expect(result).toEqual([
				{
					video: {
						url: 'https://example.com/video.mp4',
						width: 1270,
						height: 720,
					},
				},
			]);
		});

		it('should wrap a thumbnail URL string into a thumbnail object', () => {
			const embeds: IDataObject[] = [
				{
					inputMethod: 'fields',
					thumbnail: 'https://example.com/thumb.png',
				},
			];

			const result = prepareEmbeds.call(mockExecuteFunctions, embeds);

			expect(result).toEqual([
				{
					thumbnail: { url: 'https://example.com/thumb.png' },
				},
			]);
		});

		it('should wrap an image URL string into an image object', () => {
			const embeds: IDataObject[] = [
				{
					inputMethod: 'fields',
					image: 'https://example.com/image.png',
				},
			];

			const result = prepareEmbeds.call(mockExecuteFunctions, embeds);

			expect(result).toEqual([
				{
					image: { url: 'https://example.com/image.png' },
				},
			]);
		});

		it('should not re-wrap an image that is already an object', () => {
			const embeds: IDataObject[] = [
				{
					inputMethod: 'fields',
					image: { url: 'https://example.com/image.png', width: 100, height: 100 },
				},
			];

			const result = prepareEmbeds.call(mockExecuteFunctions, embeds);

			expect(result).toEqual([
				{
					image: { url: 'https://example.com/image.png', width: 100, height: 100 },
				},
			]);
		});

		it('should preserve sibling fields when the image is already an object', () => {
			const embeds: IDataObject[] = [
				{
					inputMethod: 'fields',
					title: 'Has image object',
					image: { url: 'https://example.com/pic.png' },
				},
			];

			const result = prepareEmbeds.call(mockExecuteFunctions, embeds);

			expect(result).toEqual([
				{
					title: 'Has image object',
					image: { url: 'https://example.com/pic.png' },
				},
			]);
		});

		it('should parse a valid JSON string when inputMethod is json', () => {
			const embeds: IDataObject[] = [
				{
					inputMethod: 'json',
					json: '{"title":"From JSON","color":"#00FF00"}',
				},
			];

			const result = prepareEmbeds.call(mockExecuteFunctions, embeds);

			expect(result).toEqual([{ title: 'From JSON', color: 65280 }]);
		});

		it('should throw a NodeOperationError when the JSON string is invalid', () => {
			const embeds: IDataObject[] = [
				{
					inputMethod: 'json',
					json: '{invalid json',
				},
			];

			expect(() => prepareEmbeds.call(mockExecuteFunctions, embeds)).toThrow(NodeOperationError);
			expect(() => prepareEmbeds.call(mockExecuteFunctions, embeds)).toThrow('Not a valid JSON');
		});

		it('should filter out embeds that end up empty', () => {
			const embeds: IDataObject[] = [
				{
					inputMethod: 'fields',
					description: '',
				},
				{
					inputMethod: 'fields',
					title: 'Kept',
				},
			];

			const result = prepareEmbeds.call(mockExecuteFunctions, embeds);

			expect(result).toEqual([{ title: 'Kept' }]);
		});

		it('should process multiple embeds independently', () => {
			const embeds: IDataObject[] = [
				{
					inputMethod: 'fields',
					title: 'First',
					image: 'https://example.com/first.png',
				},
				{
					inputMethod: 'fields',
					title: 'Second',
					image: { url: 'https://example.com/second.png' },
				},
			];

			const result = prepareEmbeds.call(mockExecuteFunctions, embeds);

			expect(result).toEqual([
				{ title: 'First', image: { url: 'https://example.com/first.png' } },
				{ title: 'Second', image: { url: 'https://example.com/second.png' } },
			]);
		});
	});

	describe('getAuditLogReasonHeaders', () => {
		let mockExecuteFunctions: IExecuteFunctions;

		// Returns getNodeParameter values keyed by parameter name for a single item.
		const mockParams = (params: Record<string, string>) => {
			mockExecuteFunctions.getNodeParameter = vi
				.fn()
				.mockImplementation((name: string, _i: number, fallback: string) =>
					name in params ? params[name] : fallback,
				);
		};

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		});

		afterEach(() => {
			vi.resetAllMocks();
		});

		it('maps a preset reason to its label and URL-encodes it', () => {
			mockParams({ reason: 'suspicious_spam' });

			const headers = getAuditLogReasonHeaders.call(mockExecuteFunctions, 0);

			expect(headers).toEqual({ 'X-Audit-Log-Reason': 'Suspicious%20or%20spam%20account' });
		});

		it('uses the custom text when the reason is "other"', () => {
			mockParams({ reason: 'other', reasonCustom: 'Posting phishing links' });

			const headers = getAuditLogReasonHeaders.call(mockExecuteFunctions, 0);

			expect(headers).toEqual({ 'X-Audit-Log-Reason': 'Posting%20phishing%20links' });
		});

		it('returns no header when the reason is "other" but the custom text is empty', () => {
			mockParams({ reason: 'other', reasonCustom: '' });

			expect(getAuditLogReasonHeaders.call(mockExecuteFunctions, 0)).toEqual({});
		});

		it('returns no header when no reason is set', () => {
			mockParams({});

			expect(getAuditLogReasonHeaders.call(mockExecuteFunctions, 0)).toEqual({});
		});
	});
});
