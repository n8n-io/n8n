import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode, IBinaryData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { Compression } from '../../Compression.node';
import { boundedGunzip } from '../../decompress/BoundedGunzip';
import { boundedUnzip } from '../../decompress/BoundedUnzip';

jest.mock('../../decompress/BoundedGunzip');
jest.mock('../../decompress/BoundedUnzip');

const mockBoundedUnzip = (data: Record<string, Buffer>, error?: Error) => {
	if (error) {
		jest.mocked(boundedUnzip).mockRejectedValue(error);
	} else {
		jest.mocked(boundedUnzip).mockResolvedValue(data);
	}
};

const mockBoundedGunzip = (data: Buffer, error?: Error) => {
	if (error) {
		jest.mocked(boundedGunzip).mockRejectedValue(error);
	} else {
		jest.mocked(boundedGunzip).mockResolvedValue(data);
	}
};

describe('Compression Node - Decompress Operation', () => {
	let compression: Compression;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	const mockNode: INode = {
		id: 'test-node',
		name: 'Compression',
		type: 'n8n-nodes-base.compression',
		typeVersion: 1.1,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		compression = new Compression();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		jest.clearAllMocks();

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: { test: 'data' } }]);
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			const params: Record<string, string> = {
				operation: 'decompress',
				binaryPropertyName: 'data',
				outputPrefix: 'file_',
			};
			return params[paramName];
		});
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Zip Decompression', () => {
		it('should decompress a zip file successfully', async () => {
			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/zip',
				fileName: 'test.zip',
				fileExtension: 'zip',
			};

			const mockZipContents: Record<string, Buffer> = {
				file1_txt: Buffer.from([72, 101, 108, 108, 111]),
				file2_txt: Buffer.from([87, 111, 114, 108, 100]),
			};

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('mock zip data'));
			mockBoundedUnzip(mockZipContents);

			jest.mocked(mockExecuteFunctions.helpers.prepareBinaryData).mockImplementation(
				async (buffer, fileName) =>
					({
						data: buffer.toString('base64'),
						mimeType: 'text/plain',
						fileName: fileName ?? 'file',
						fileExtension: 'txt',
					}) as IBinaryData,
			);

			const result = await compression.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ test: 'data' });
			expect(result[0][0].binary).toBeDefined();
			expect(result[0][0].binary?.file_0).toBeDefined();
			expect(result[0][0].binary?.file_1).toBeDefined();
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
			expect(boundedUnzip).toHaveBeenCalledTimes(1);
		});

		it('should skip __MACOSX files when decompressing zip', async () => {
			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/zip',
				fileName: 'test.zip',
				fileExtension: 'zip',
			};

			const mockZipContents: Record<string, Buffer> = {
				file1_txt: Buffer.from([72, 101, 108, 108, 111]),
				__MACOSX_file1_txt: Buffer.from([0, 0, 0]),
				file2_txt: Buffer.from([87, 111, 114, 108, 100]),
			};

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('mock zip data'));
			mockBoundedUnzip(mockZipContents);

			jest.mocked(mockExecuteFunctions.helpers.prepareBinaryData).mockImplementation(
				async (buffer, fileName) =>
					({
						data: buffer.toString('base64'),
						mimeType: 'text/plain',
						fileName: fileName ?? 'file',
						fileExtension: 'txt',
					}) as IBinaryData,
			);

			const result = await compression.execute.call(mockExecuteFunctions);

			expect(result[0][0].binary?.file_0).toBeDefined();
			expect(result[0][0].binary?.file_1).toBeDefined();
			expect(jest.mocked(mockExecuteFunctions.helpers.prepareBinaryData)).toHaveBeenCalledTimes(2);
		});

		it('should process multiple zip files from comma-separated binary properties', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string> = {
					operation: 'decompress',
					binaryPropertyName: 'data1,data2',
					outputPrefix: 'file_',
				};
				return params[paramName];
			});

			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/zip',
				fileName: 'test.zip',
				fileExtension: 'zip',
			};

			const mockZipContents: Record<string, Buffer> = {
				file_txt: Buffer.from([72, 101, 108, 108, 111]),
			};

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('mock zip data'));
			mockBoundedUnzip(mockZipContents);

			jest.mocked(mockExecuteFunctions.helpers.prepareBinaryData).mockImplementation(
				async (buffer, fileName) =>
					({
						data: buffer.toString('base64'),
						mimeType: 'text/plain',
						fileName: fileName ?? 'file',
						fileExtension: 'txt',
					}) as IBinaryData,
			);

			await compression.execute.call(mockExecuteFunctions);

			expect(boundedUnzip).toHaveBeenCalledTimes(2);
			expect(jest.mocked(mockExecuteFunctions.helpers.assertBinaryData)).toHaveBeenCalledWith(
				0,
				'data1',
			);
			expect(jest.mocked(mockExecuteFunctions.helpers.assertBinaryData)).toHaveBeenCalledWith(
				0,
				'data2',
			);
		});
	});

	describe('Gzip Decompression', () => {
		it('should decompress a gzip file successfully', async () => {
			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/gzip',
				fileName: 'test.txt.gz',
				fileExtension: 'gz',
			};

			const mockGunzipData = Buffer.from([72, 101, 108, 108, 111]);

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('mock gzip data'));
			mockBoundedGunzip(mockGunzipData);

			jest.mocked(mockExecuteFunctions.helpers.prepareBinaryData).mockResolvedValue({
				data: 'SGVsbG8=',
				mimeType: 'text/plain',
				fileName: 'test.txt',
				fileExtension: 'txt',
			} as IBinaryData);

			const result = await compression.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].binary?.file_0).toBeDefined();
			expect(result[0][0].binary?.file_0?.fileName).toBe('test.txt');
			expect(result[0][0].binary?.file_0?.fileExtension).toBe('txt');
			expect(result[0][0].binary?.file_0?.mimeType).toBe('text/plain');
			expect(boundedGunzip).toHaveBeenCalledTimes(1);
		});

		it('should handle gzip file with .gzip extension', async () => {
			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/gzip',
				fileName: 'test.txt.gzip',
				fileExtension: 'gzip',
			};

			const mockGunzipData = Buffer.from([72, 101, 108, 108, 111]);

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('mock gzip data'));
			mockBoundedGunzip(mockGunzipData);

			jest.mocked(mockExecuteFunctions.helpers.prepareBinaryData).mockResolvedValue({
				data: 'SGVsbG8=',
				mimeType: 'text/plain',
				fileName: 'test.txt',
				fileExtension: 'txt',
			} as IBinaryData);

			const result = await compression.execute.call(mockExecuteFunctions);

			expect(result[0][0].binary?.file_0).toBeDefined();
			expect(boundedGunzip).toHaveBeenCalledTimes(1);
		});

		it('should determine mime type and file extension for gzip file', async () => {
			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/gzip',
				fileName: 'data.json.gz',
				fileExtension: 'gz',
			};

			const mockGunzipData = Buffer.from([123, 125]);

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('mock gzip data'));
			mockBoundedGunzip(mockGunzipData);

			let callCount = 0;
			jest
				.mocked(mockExecuteFunctions.helpers.prepareBinaryData)
				.mockImplementation(async (buffer, fileName, mimeType) => {
					callCount++;
					if (callCount === 1) {
						return {
							data: buffer.toString('base64'),
							mimeType: 'application/json',
							fileName: fileName ?? 'data',
							fileExtension: 'json',
						} as IBinaryData;
					}
					return {
						data: buffer.toString('base64'),
						mimeType: mimeType ?? 'application/json',
						fileName: fileName ?? 'data',
						fileExtension: 'json',
					} as IBinaryData;
				});

			const result = await compression.execute.call(mockExecuteFunctions);

			expect(result[0][0].binary?.file_0?.fileName).toBe('data.json');
			expect(result[0][0].binary?.file_0?.fileExtension).toBe('json');
			expect(result[0][0].binary?.file_0?.mimeType).toBe('application/json');
		});

		it('should process multiple gzip files', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string> = {
					operation: 'decompress',
					binaryPropertyName: 'data1,data2',
					outputPrefix: 'file_',
				};
				return params[paramName];
			});

			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/gzip',
				fileName: 'test.txt.gz',
				fileExtension: 'gz',
			};

			const mockGunzipData = Buffer.from([72, 101, 108, 108, 111]);

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('mock gzip data'));
			mockBoundedGunzip(mockGunzipData);

			jest.mocked(mockExecuteFunctions.helpers.prepareBinaryData).mockResolvedValue({
				data: 'SGVsbG8=',
				mimeType: 'text/plain',
				fileName: 'test.txt',
				fileExtension: 'txt',
			} as IBinaryData);

			const result = await compression.execute.call(mockExecuteFunctions);

			expect(result[0][0].binary?.file_0).toBeDefined();
			expect(result[0][0].binary?.file_1).toBeDefined();
			expect(boundedGunzip).toHaveBeenCalledTimes(2);
		});
	});

	describe('Error Handling', () => {
		it('should throw error when file extension is not found', async () => {
			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/octet-stream',
				fileName: undefined,
				fileExtension: undefined,
			};

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);

			await expect(compression.execute.call(mockExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});

		it('should handle decompression errors with continueOnFail', async () => {
			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/zip',
				fileName: 'test.zip',
				fileExtension: 'zip',
			};

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('invalid zip data'));
			mockBoundedUnzip({}, new Error('Invalid zip file'));
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const result = await compression.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toHaveProperty('error', 'Invalid zip file');
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
		});

		it('should throw error when continueOnFail is false', async () => {
			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/zip',
				fileName: 'test.zip',
				fileExtension: 'zip',
			};

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('invalid zip data'));
			mockBoundedUnzip({}, new Error('Invalid zip file'));
			mockExecuteFunctions.continueOnFail.mockReturnValue(false);

			await expect(compression.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Invalid zip file',
			);
		});

		it('should handle gunzip errors with continueOnFail', async () => {
			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/gzip',
				fileName: 'test.txt.gz',
				fileExtension: 'gz',
			};

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('invalid gzip data'));
			mockBoundedGunzip(Buffer.alloc(0), new Error('Invalid gzip file'));
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const result = await compression.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toHaveProperty('error', 'Invalid gzip file');
		});

		it('should throw when fileExtension is missing', async () => {
			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/zip',
				fileName: 'test.zip',
			};

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('mock zip data'));

			await expect(compression.execute.call(mockExecuteFunctions)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});

	describe('Multiple Items Processing', () => {
		it('should process multiple input items', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([
				{ json: { item: 1 } },
				{ json: { item: 2 } },
			]);

			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/gzip',
				fileName: 'test.txt.gz',
				fileExtension: 'gz',
			};

			const mockGunzipData = Buffer.from([72, 101, 108, 108, 111]);

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('mock gzip data'));
			mockBoundedGunzip(mockGunzipData);

			jest.mocked(mockExecuteFunctions.helpers.prepareBinaryData).mockResolvedValue({
				data: 'SGVsbG8=',
				mimeType: 'text/plain',
				fileName: 'test.txt',
				fileExtension: 'txt',
			} as IBinaryData);

			const result = await compression.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(2);
			expect(result[0][0].json).toEqual({ item: 1 });
			expect(result[0][1].json).toEqual({ item: 2 });
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
			expect(result[0][1].pairedItem).toEqual({ item: 1 });
		});
	});

	describe('Edge Cases', () => {
		it('should use custom output prefix', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string> = {
					operation: 'decompress',
					binaryPropertyName: 'data',
					outputPrefix: 'extracted_',
				};
				return params[paramName];
			});

			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/zip',
				fileName: 'test.zip',
				fileExtension: 'zip',
			};

			const mockZipContents: Record<string, Buffer> = {
				file1_txt: Buffer.from([72, 101, 108, 108, 111]),
			};

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('mock zip data'));
			mockBoundedUnzip(mockZipContents);

			jest.mocked(mockExecuteFunctions.helpers.prepareBinaryData).mockResolvedValue({
				data: 'SGVsbG8=',
				mimeType: 'text/plain',
				fileName: 'file1.txt',
				fileExtension: 'txt',
			} as IBinaryData);

			const result = await compression.execute.call(mockExecuteFunctions);

			expect(result[0][0].binary?.extracted_0).toBeDefined();
		});

		it('should handle empty zip archive', async () => {
			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/zip',
				fileName: 'empty.zip',
				fileExtension: 'zip',
			};

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('mock zip data'));
			mockBoundedUnzip({});

			const result = await compression.execute.call(mockExecuteFunctions);

			expect(result[0][0].binary).toEqual({});
			expect(result[0][0].json).toEqual({ test: 'data' });
		});

		it('should trim whitespace from binary property names', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string> = {
					operation: 'decompress',
					binaryPropertyName: ' data1 , data2 ',
					outputPrefix: 'file_',
				};
				return params[paramName];
			});

			const mockBinaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/gzip',
				fileName: 'test.txt.gz',
				fileExtension: 'gz',
			};

			const mockGunzipData = Buffer.from([72, 101, 108, 108, 111]);

			jest.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue(mockBinaryData);
			jest
				.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer)
				.mockResolvedValue(Buffer.from('mock gzip data'));
			mockBoundedGunzip(mockGunzipData);

			jest.mocked(mockExecuteFunctions.helpers.prepareBinaryData).mockResolvedValue({
				data: 'SGVsbG8=',
				mimeType: 'text/plain',
				fileName: 'test.txt',
				fileExtension: 'txt',
			} as IBinaryData);

			const result = await compression.execute.call(mockExecuteFunctions);

			expect(jest.mocked(mockExecuteFunctions.helpers.assertBinaryData)).toHaveBeenCalledWith(
				0,
				'data1',
			);
			expect(jest.mocked(mockExecuteFunctions.helpers.assertBinaryData)).toHaveBeenCalledWith(
				0,
				'data2',
			);
			expect(result[0][0].binary?.file_0).toBeDefined();
			expect(result[0][0].binary?.file_1).toBeDefined();
		});
	});
});
