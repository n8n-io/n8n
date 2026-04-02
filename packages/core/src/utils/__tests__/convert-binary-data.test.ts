import { Container } from '@n8n/di';
import type { IBinaryData, IRunNodeResponse } from 'n8n-workflow';
import { BINARY_ENCODING, BINARY_IN_JSON_PROPERTY, BINARY_MODE_COMBINED } from 'n8n-workflow';

import type { BinaryDataConfig } from '../../binary-data/binary-data.config';
import * as binaryHelperFunctions from '../../execution-engine/node-execution-context/utils/binary-helper-functions';
import { convertBinaryData } from '../convert-binary-data';

jest.mock('../../execution-engine/node-execution-context/utils/binary-helper-functions');

describe('convertBinaryData', () => {
	const workflowId = 'test-workflow-id';
	const executionId = 'test-execution-id';
	const mockBinaryDataConfig = { mode: 'default' } as BinaryDataConfig;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(Container, 'get').mockReturnValue(mockBinaryDataConfig);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('early returns', () => {
		it('should return unchanged data when binaryMode is not "combined"', async () => {
			mockBinaryDataConfig.mode = 'filesystem';

			const responseData: IRunNodeResponse = {
				data: [[{ json: { test: 'data' } }]],
			};

			const result = await convertBinaryData(workflowId, executionId, responseData, undefined);

			expect(result).toBe(responseData);
		});

		it('should return unchanged data when mode is "default"', async () => {
			mockBinaryDataConfig.mode = 'default';

			const responseData: IRunNodeResponse = {
				data: [[{ json: { test: 'data' } }]],
			};

			const result = await convertBinaryData(
				workflowId,
				executionId,
				responseData,
				BINARY_MODE_COMBINED,
			);

			expect(result).toBe(responseData);
		});

		it('should return unchanged data when responseData has no data', async () => {
			mockBinaryDataConfig.mode = 'filesystem';

			const responseData: IRunNodeResponse = {
				data: [],
			};

			const result = await convertBinaryData(
				workflowId,
				executionId,
				responseData,
				BINARY_MODE_COMBINED,
			);

			expect(result).toBe(responseData);
		});
	});

	describe('binary data conversion', () => {
		beforeEach(() => {
			mockBinaryDataConfig.mode = 'filesystem';
		});

		it('should handle items without binary data', async () => {
			const responseData: IRunNodeResponse = {
				data: [[{ json: { test: 'data' } }]],
			};

			const result = await convertBinaryData(
				workflowId,
				executionId,
				responseData,
				BINARY_MODE_COMBINED,
			);

			expect(result.data?.[0]?.[0]?.json).toEqual({ test: 'data' });
		});

		it('should move binary data with id to json binaries', async () => {
			const binaryWithId: IBinaryData = {
				id: 'binary-id-123',
				mimeType: 'image/png',
				fileSize: '1024',
				fileName: 'test.png',
				directory: '/tmp',
				fileExtension: 'png',
				data: '',
			};

			const responseData: IRunNodeResponse = {
				data: [
					[
						{
							json: { test: 'data' },
							binary: {
								image: binaryWithId,
							},
						},
					],
				],
			};

			const result = await convertBinaryData(
				workflowId,
				executionId,
				responseData,
				BINARY_MODE_COMBINED,
			);

			const item = result.data?.[0]?.[0];
			expect(item?.json[BINARY_IN_JSON_PROPERTY]).toEqual({
				image: binaryWithId,
			});
			expect(item?.binary).toBeUndefined();
		});

		it('should keep embedded binaries when no executionId', async () => {
			const embeddedBinary: IBinaryData = {
				data: Buffer.from('test data').toString(BINARY_ENCODING),
				mimeType: 'text/plain',
				fileSize: '9',
				fileName: 'test.txt',
				directory: '',
				fileExtension: 'txt',
			};

			const responseData: IRunNodeResponse = {
				data: [
					[
						{
							json: { test: 'data' },
							binary: {
								file: embeddedBinary,
							},
						},
					],
				],
			};

			const result = await convertBinaryData(
				workflowId,
				undefined,
				responseData,
				BINARY_MODE_COMBINED,
			);

			const item = result.data?.[0]?.[0];
			expect(item?.binary).toEqual({
				file: embeddedBinary,
			});
			expect(item?.json[BINARY_IN_JSON_PROPERTY]).toBeUndefined();
		});

		it('should convert binary data to stored format with executionId', async () => {
			const binaryData: IBinaryData = {
				data: Buffer.from('test data').toString(BINARY_ENCODING),
				mimeType: 'text/plain',
				fileSize: '9',
				fileName: 'test.txt',
				directory: '',
				fileExtension: 'txt',
			};

			const convertedBinary: IBinaryData = {
				id: 'stored-binary-id',
				mimeType: 'text/plain',
				fileSize: '9',
				fileName: 'test.txt',
				directory: '/binary/storage',
				fileExtension: 'txt',
				data: '',
			};

			jest.spyOn(binaryHelperFunctions, 'prepareBinaryData').mockResolvedValue(convertedBinary);

			const responseData: IRunNodeResponse = {
				data: [
					[
						{
							json: { test: 'data' },
							binary: {
								file: binaryData,
							},
						},
					],
				],
			};

			const result = await convertBinaryData(
				workflowId,
				executionId,
				responseData,
				BINARY_MODE_COMBINED,
			);

			expect(binaryHelperFunctions.prepareBinaryData).toHaveBeenCalledWith(
				Buffer.from('test data'),
				executionId,
				workflowId,
				undefined,
				'text/plain',
			);

			const item = result.data?.[0]?.[0];
			expect(item?.json[BINARY_IN_JSON_PROPERTY]).toEqual({
				file: convertedBinary,
			});
			expect(item?.binary).toBeUndefined();
		});

		it('should preserve fileName when converting binary data', async () => {
			const binaryData: IBinaryData = {
				data: Buffer.from('test').toString(BINARY_ENCODING),
				mimeType: 'text/plain',
				fileName: 'original.txt',
				fileSize: '4',
				directory: '',
				fileExtension: 'txt',
			};

			const convertedBinary: IBinaryData = {
				id: 'stored-id',
				mimeType: 'text/plain',
				fileSize: '4',
				fileName: '',
				directory: '/storage',
				fileExtension: 'txt',
				data: '',
			};

			jest.spyOn(binaryHelperFunctions, 'prepareBinaryData').mockResolvedValue(convertedBinary);

			const responseData: IRunNodeResponse = {
				data: [
					[
						{
							json: {},
							binary: {
								file: binaryData,
							},
						},
					],
				],
			};

			const result = await convertBinaryData(
				workflowId,
				executionId,
				responseData,
				BINARY_MODE_COMBINED,
			);

			const item = result.data?.[0]?.[0];
			const jsonBinary = item?.json[BINARY_IN_JSON_PROPERTY] as Record<string, IBinaryData>;
			expect(jsonBinary.file.fileName).toBe('original.txt');
		});

		it('should merge with existing json binaries', async () => {
			const existingBinary: IBinaryData = {
				id: 'existing-id',
				mimeType: 'image/png',
				fileSize: '1024',
				fileName: 'existing.png',
				directory: '/storage',
				fileExtension: 'png',
				data: '',
			};

			const newBinary: IBinaryData = {
				id: 'new-id',
				mimeType: 'text/plain',
				fileSize: '100',
				fileName: 'new.txt',
				directory: '/storage',
				fileExtension: 'txt',
				data: '',
			};

			const responseData: IRunNodeResponse = {
				data: [
					[
						{
							json: {
								[BINARY_IN_JSON_PROPERTY]: {
									existing: existingBinary,
								},
							},
							binary: {
								new: newBinary,
							},
						},
					],
				],
			};

			const result = await convertBinaryData(
				workflowId,
				executionId,
				responseData,
				BINARY_MODE_COMBINED,
			);

			const item = result.data?.[0]?.[0];
			expect(item?.json[BINARY_IN_JSON_PROPERTY]).toEqual({
				existing: existingBinary,
				new: newBinary,
			});
		});

		it('should handle mixed binary types (with id and convertable)', async () => {
			const binaryWithId: IBinaryData = {
				id: 'has-id',
				mimeType: 'image/png',
				fileSize: '1024',
				fileName: 'image.png',
				directory: '/storage',
				fileExtension: 'png',
				data: '',
			};

			const convertedBinary: IBinaryData = {
				id: 'converted-id',
				mimeType: 'application/json',
				fileSize: '50',
				fileName: 'converted.json',
				directory: '/storage',
				fileExtension: 'json',
				data: '',
			};

			jest.spyOn(binaryHelperFunctions, 'prepareBinaryData').mockResolvedValue(convertedBinary);

			const responseData: IRunNodeResponse = {
				data: [
					[
						{
							json: {},
							binary: {
								withId: binaryWithId,
								toConvert: {
									data: Buffer.from('convert me').toString(BINARY_ENCODING),
									mimeType: 'application/json',
									fileSize: '10',
									fileName: 'convert.json',
									directory: '',
									fileExtension: 'json',
								},
							},
						},
					],
				],
			};

			// Test with executionId to trigger conversion
			const result = await convertBinaryData(
				workflowId,
				executionId,
				responseData,
				BINARY_MODE_COMBINED,
			);

			const item = result.data?.[0]?.[0];
			expect(item?.json[BINARY_IN_JSON_PROPERTY]).toEqual({
				withId: binaryWithId,
				toConvert: convertedBinary,
			});
			expect(item?.binary).toBeUndefined();
		});

		it('should process multiple output arrays', async () => {
			const binary1: IBinaryData = {
				id: 'binary-1',
				mimeType: 'image/png',
				fileSize: '1024',
				fileName: 'image1.png',
				directory: '/storage',
				fileExtension: 'png',
				data: '',
			};

			const binary2: IBinaryData = {
				id: 'binary-2',
				mimeType: 'image/jpeg',
				fileSize: '2048',
				fileName: 'image2.jpg',
				directory: '/storage',
				fileExtension: 'jpg',
				data: '',
			};

			const responseData: IRunNodeResponse = {
				data: [
					[
						{
							json: {},
							binary: { file1: binary1 },
						},
					],
					[
						{
							json: {},
							binary: { file2: binary2 },
						},
					],
				],
			};

			const result = await convertBinaryData(
				workflowId,
				executionId,
				responseData,
				BINARY_MODE_COMBINED,
			);

			expect(result.data?.[0]?.[0]?.json[BINARY_IN_JSON_PROPERTY]).toEqual({
				file1: binary1,
			});
			expect(result.data?.[1]?.[0]?.json[BINARY_IN_JSON_PROPERTY]).toEqual({
				file2: binary2,
			});
		});

		it('should process multiple items in output array', async () => {
			const binary1: IBinaryData = {
				id: 'binary-1',
				mimeType: 'text/plain',
				fileSize: '100',
				fileName: 'file1.txt',
				directory: '/storage',
				fileExtension: 'txt',
				data: '',
			};

			const binary2: IBinaryData = {
				id: 'binary-2',
				mimeType: 'text/plain',
				fileSize: '200',
				fileName: 'file2.txt',
				directory: '/storage',
				fileExtension: 'txt',
				data: '',
			};

			const responseData: IRunNodeResponse = {
				data: [
					[
						{
							json: { item: 1 },
							binary: { file: binary1 },
						},
						{
							json: { item: 2 },
							binary: { file: binary2 },
						},
					],
				],
			};

			const result = await convertBinaryData(
				workflowId,
				executionId,
				responseData,
				BINARY_MODE_COMBINED,
			);

			expect(result.data?.[0]?.[0]?.json).toEqual({
				item: 1,
				[BINARY_IN_JSON_PROPERTY]: { file: binary1 },
			});
			expect(result.data?.[0]?.[1]?.json).toEqual({
				item: 2,
				[BINARY_IN_JSON_PROPERTY]: { file: binary2 },
			});
		});
	});
});
