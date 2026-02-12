import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';
import { prepareMultiPartForm } from '../utils';

describe('Discord V2 Utils', () => {
	describe('prepareMultiPartForm', () => {
		let mockExecuteFunctions: IExecuteFunctions;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		});

		afterEach(() => {
			jest.resetAllMocks();
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

			mockExecuteFunctions.helpers.assertBinaryData = jest.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = jest
				.fn()
				.mockResolvedValue(Buffer.from('test file content'));
			mockExecuteFunctions.getNode = jest.fn().mockReturnValue({ name: 'Discord' });

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

			mockExecuteFunctions.helpers.assertBinaryData = jest
				.fn()
				.mockReturnValueOnce(binaryData1)
				.mockReturnValueOnce(binaryData2);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = jest
				.fn()
				.mockResolvedValueOnce(Buffer.from('test file content 1'))
				.mockResolvedValueOnce(Buffer.from('test file content 2'));
			mockExecuteFunctions.getNode = jest.fn().mockReturnValue({ name: 'Discord' });

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

			mockExecuteFunctions.helpers.assertBinaryData = jest.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = jest
				.fn()
				.mockResolvedValue(Buffer.from('test file content'));
			mockExecuteFunctions.getNode = jest.fn().mockReturnValue({ name: 'Discord' });

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

			mockExecuteFunctions.helpers.assertBinaryData = jest.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = jest
				.fn()
				.mockResolvedValue(Buffer.from('test file content'));
			mockExecuteFunctions.getNode = jest.fn().mockReturnValue({ name: 'Discord' });

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

			mockExecuteFunctions.helpers.assertBinaryData = jest.fn().mockReturnValue(null);
			mockExecuteFunctions.getNode = jest.fn().mockReturnValue({ name: 'Discord' });

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

			mockExecuteFunctions.helpers.assertBinaryData = jest.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = jest
				.fn()
				.mockResolvedValue(Buffer.from('pdf content'));
			mockExecuteFunctions.getNode = jest.fn().mockReturnValue({ name: 'Discord' });

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

			mockExecuteFunctions.helpers.assertBinaryData = jest
				.fn()
				.mockReturnValueOnce(binaryData1)
				.mockReturnValueOnce(binaryData2);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = jest
				.fn()
				.mockResolvedValueOnce(Buffer.from('image content'))
				.mockResolvedValueOnce(Buffer.from('text content'));
			mockExecuteFunctions.getNode = jest.fn().mockReturnValue({ name: 'Discord' });

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

		it('should handle empty files array', async () => {
			const files: IDataObject[] = [];
			const jsonPayload: IDataObject = { content: 'Test message no files' };
			const itemIndex = 0;

			mockExecuteFunctions.getNode = jest.fn().mockReturnValue({ name: 'Discord' });

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

			mockExecuteFunctions.helpers.assertBinaryData = jest.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = jest
				.fn()
				.mockResolvedValue(Buffer.from('json content'));
			mockExecuteFunctions.getNode = jest.fn().mockReturnValue({ name: 'Discord' });

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

			mockExecuteFunctions.helpers.assertBinaryData = jest.fn().mockReturnValue(binaryData);
			mockExecuteFunctions.helpers.getBinaryDataBuffer = jest
				.fn()
				.mockResolvedValue(Buffer.from('test file content'));
			mockExecuteFunctions.getNode = jest.fn().mockReturnValue({ name: 'Discord' });

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
});
