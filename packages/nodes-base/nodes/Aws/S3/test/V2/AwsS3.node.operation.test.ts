import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { AwsS3V2 } from '../../V2/AwsS3V2.node';
import * as GenericFunctions from '../../V2/GenericFunctions';

const mockLocationResponse = {
	LocationConstraint: {
		_: 'eu-central-1',
	},
};

const mockFileResponse = {
	body: Buffer.from('test file content'),
	headers: {
		'content-type': 'text/plain',
	},
};

describe('AWS S3 V2 Node - File Download', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const awsApiRequestRESTSpy = jest.spyOn(GenericFunctions, 'awsApiRequestREST');
	let node: AwsS3V2;

	beforeEach(() => {
		jest.resetAllMocks();
		node = new AwsS3V2({
			displayName: 'AWS S3',
			name: 'awsS3',
			icon: 'file:s3.svg',
			group: ['output'],
			description: 'Sends data to AWS S3',
		});

		executeFunctionsMock.getCredentials.mockResolvedValue({
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: 'eu-central-1',
		});

		executeFunctionsMock.getNode.mockReturnValue({
			typeVersion: 2,
		} as INode);

		executeFunctionsMock.getInputData.mockReturnValue([{ json: { test: 'data' } }]);
		executeFunctionsMock.continueOnFail.mockReturnValue(false);

		executeFunctionsMock.helpers.returnJsonArray.mockImplementation((data) =>
			Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }],
		);

		executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as any,
		);

		executeFunctionsMock.helpers.prepareBinaryData.mockResolvedValue({
			data: 'mock-binary-data-id',
			mimeType: 'text/plain',
			fileName: 'test.txt',
		});
	});

	describe('successful file download', () => {
		beforeEach(() => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'resource':
						return 'file';
					case 'operation':
						return 'download';
					case 'bucketName':
						return 'test-bucket';
					case 'fileKey':
						return 'path/to/test.txt';
					case 'binaryPropertyName':
						return 'data';
					default:
						return undefined;
				}
			});

			awsApiRequestRESTSpy
				.mockResolvedValueOnce(mockLocationResponse)
				.mockResolvedValueOnce(mockFileResponse);
		});

		it('should successfully download a file and return binary data', async () => {
			const result = await node.execute.call(executeFunctionsMock);

			expect(awsApiRequestRESTSpy).toHaveBeenCalledTimes(2);

			expect(awsApiRequestRESTSpy).toHaveBeenNthCalledWith(1, 'test-bucket.s3', 'GET', '', '', {
				location: '',
			});

			expect(awsApiRequestRESTSpy).toHaveBeenNthCalledWith(
				2,
				'test-bucket.s3',
				'GET',
				'/path/to/test.txt',
				'',
				{},
				{},
				{ encoding: null, resolveWithFullResponse: true },
				'eu-central-1',
			);

			expect(executeFunctionsMock.helpers.prepareBinaryData).toHaveBeenCalledWith(
				expect.any(Buffer),
				'test.txt',
				'text/plain',
			);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0]).toHaveProperty('json');
			expect(result[0][0]).toHaveProperty('binary');
		});

		it('should handle bucket names with dots correctly', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'resource':
						return 'file';
					case 'operation':
						return 'download';
					case 'bucketName':
						return 'test.bucket.com';
					case 'fileKey':
						return 'path/to/test.txt';
					case 'binaryPropertyName':
						return 'data';
					default:
						return undefined;
				}
			});

			await node.execute.call(executeFunctionsMock);

			expect(awsApiRequestRESTSpy).toHaveBeenNthCalledWith(1, 's3', 'GET', '/test.bucket.com', '', {
				location: '',
			});

			expect(awsApiRequestRESTSpy).toHaveBeenNthCalledWith(
				2,
				's3',
				'GET',
				'/test.bucket.com/path/to/test.txt',
				'',
				{},
				{},
				{ encoding: null, resolveWithFullResponse: true },
				'eu-central-1',
			);
		});

		it('should extract filename correctly from different file key formats', async () => {
			const testCases = [
				{ fileKey: 'simple.txt', expectedFileName: 'simple.txt' },
				{ fileKey: 'path/to/file.pdf', expectedFileName: 'file.pdf' },
				{ fileKey: 'deep/nested/path/document.docx', expectedFileName: 'document.docx' },
			];

			for (const testCase of testCases) {
				jest.clearAllMocks();
				awsApiRequestRESTSpy
					.mockResolvedValueOnce(mockLocationResponse)
					.mockResolvedValueOnce(mockFileResponse);

				executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
					switch (paramName) {
						case 'resource':
							return 'file';
						case 'operation':
							return 'download';
						case 'bucketName':
							return 'test-bucket';
						case 'fileKey':
							return testCase.fileKey;
						case 'binaryPropertyName':
							return 'data';
						default:
							return undefined;
					}
				});

				await node.execute.call(executeFunctionsMock);

				expect(executeFunctionsMock.helpers.prepareBinaryData).toHaveBeenCalledWith(
					expect.any(Buffer),
					testCase.expectedFileName,
					'text/plain',
				);
			}
		});
	});

	describe('error handling', () => {
		beforeEach(() => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'resource':
						return 'file';
					case 'operation':
						return 'download';
					case 'bucketName':
						return 'test-bucket';
					case 'fileKey':
						return 'path/to/directory/';
					case 'binaryPropertyName':
						return 'data';
					default:
						return undefined;
				}
			});
		});

		it('should throw error when trying to download a directory', async () => {
			await expect(node.execute.call(executeFunctionsMock)).rejects.toThrow(NodeOperationError);
			await expect(node.execute.call(executeFunctionsMock)).rejects.toThrow(
				'Downloading a whole directory is not yet supported, please provide a file key',
			);
		});
	});

	describe('continueOnFail logic', () => {
		beforeEach(() => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'resource':
						return 'file';
					case 'operation':
						return 'download';
					case 'bucketName':
						return 'test-bucket';
					case 'fileKey':
						return 'path/to/test.txt';
					case 'binaryPropertyName':
						return 'data';
					default:
						return undefined;
				}
			});
		});

		it('should continue execution and return error data when continueOnFail is true', async () => {
			const testError = new Error('AWS API Error');
			executeFunctionsMock.continueOnFail.mockReturnValue(true);
			awsApiRequestRESTSpy.mockRejectedValue(testError);

			const result = await node.execute.call(executeFunctionsMock);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ error: 'AWS API Error' });

			expect(executeFunctionsMock.helpers.constructExecutionMetaData).toHaveBeenCalledWith(
				[{ json: { error: 'AWS API Error' } }],
				{ itemData: { item: 0 } },
			);
		});

		it('should throw error when continueOnFail is false', async () => {
			const testError = new Error('AWS API Error');
			executeFunctionsMock.continueOnFail.mockReturnValue(false);
			awsApiRequestRESTSpy.mockRejectedValue(testError);

			await expect(node.execute.call(executeFunctionsMock)).rejects.toThrow('AWS API Error');
		});

		it('should handle multiple items with mixed success/failure when continueOnFail is true', async () => {
			executeFunctionsMock.getInputData.mockReturnValue([
				{ json: { test: 'data1' } },
				{ json: { test: 'data2' } },
				{ json: { test: 'data3' } },
			]);

			executeFunctionsMock.continueOnFail.mockReturnValue(true);

			awsApiRequestRESTSpy
				.mockResolvedValueOnce(mockLocationResponse)
				.mockResolvedValueOnce(mockFileResponse)
				.mockResolvedValueOnce(mockLocationResponse)
				.mockRejectedValueOnce(new Error('File not found'))
				.mockResolvedValueOnce(mockLocationResponse)
				.mockResolvedValueOnce(mockFileResponse);

			const result = await node.execute.call(executeFunctionsMock);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(3);

			expect(result[0][0]).toHaveProperty('binary');
			expect(result[0][1].json).toEqual({ error: 'File not found' });
			expect(result[0][2]).toHaveProperty('binary');
		});
	});

	describe('binary data handling', () => {
		beforeEach(() => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'resource':
						return 'file';
					case 'operation':
						return 'download';
					case 'bucketName':
						return 'test-bucket';
					case 'fileKey':
						return 'path/to/test.txt';
					case 'binaryPropertyName':
						return 'customData';
					default:
						return undefined;
				}
			});

			awsApiRequestRESTSpy
				.mockResolvedValueOnce(mockLocationResponse)
				.mockResolvedValueOnce(mockFileResponse);
		});

		it('should handle custom binary property name', async () => {
			await node.execute.call(executeFunctionsMock);

			expect(executeFunctionsMock.helpers.prepareBinaryData).toHaveBeenCalledWith(
				expect.any(Buffer),
				'test.txt',
				'text/plain',
			);
		});

		it('should preserve existing binary data when adding new binary data', async () => {
			executeFunctionsMock.getInputData.mockReturnValue([
				{
					json: { test: 'data' },
					binary: {
						existingFile: {
							data: 'existing-data',
							mimeType: 'image/png',
							fileName: 'existing.png',
						},
					},
				},
			]);

			const result = await node.execute.call(executeFunctionsMock);

			expect(result[0][0].binary).toHaveProperty('existingFile');
			expect(result[0][0].binary).toHaveProperty('customData');
		});
	});
});
