import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { AwsS3V2 } from '../../V2/AwsS3V2.node';
import * as GenericFunctions from '../../V2/GenericFunctions';
import type { MockInstance } from 'vitest';

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
	let awsApiRequestRESTSpy: MockInstance;
	let node: AwsS3V2;

	beforeEach(() => {
		vi.resetAllMocks();
		awsApiRequestRESTSpy = vi.spyOn(GenericFunctions, 'awsApiRequestREST');
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

		executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 2 } as INode);
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
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
				vi.clearAllMocks();
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
});

describe('AWS S3 V2 Node - Bucket Delete', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	let awsApiRequestRESTSpy: MockInstance;
	let node: AwsS3V2;

	beforeEach(() => {
		vi.resetAllMocks();
		awsApiRequestRESTSpy = vi.spyOn(GenericFunctions, 'awsApiRequestREST');
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

		executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 2 } as INode);
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.continueOnFail.mockReturnValue(false);

		executeFunctionsMock.helpers.returnJsonArray.mockImplementation((data) =>
			Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }],
		);

		executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as any,
		);

		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'bucket';
				case 'operation':
					return 'delete';
				case 'name':
					return 'my-test-bucket';
				default:
					return undefined;
			}
		});
	});

	it('should send DELETE request and return success (204)', async () => {
		awsApiRequestRESTSpy.mockResolvedValueOnce(undefined);

		const result = await node.execute.call(executeFunctionsMock);

		expect(awsApiRequestRESTSpy).toHaveBeenCalledWith(
			'my-test-bucket.s3',
			'DELETE',
			'',
			'',
			{},
			{},
		);

		expect(result[0][0]).toMatchObject({ json: { success: true } });
	});

	it('should handle empty string response (204)', async () => {
		awsApiRequestRESTSpy.mockResolvedValueOnce('');

		const result = await node.execute.call(executeFunctionsMock);

		expect(result[0][0]).toMatchObject({ json: { success: true } });
	});
});

describe('AWS S3 V2 Node - Bucket Search', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	let awsApiRequestRESTSpy: MockInstance;
	let awsApiRequestRESTAllItemsSpy: MockInstance;
	let node: AwsS3V2;

	const mockContents = [
		{ Key: 'file1.txt', Size: '100' },
		{ Key: 'file2.txt', Size: '200' },
	];

	const mockCommonPrefixes = [
		{ Prefix: 'folder1/' },
		{ Prefix: 'folder2/' },
	];

	const mockSearchResponse = {
		ListBucketResult: {
			Contents: mockContents,
			CommonPrefixes: mockCommonPrefixes,
		},
	};

	beforeEach(() => {
		vi.resetAllMocks();
		awsApiRequestRESTSpy = vi.spyOn(GenericFunctions, 'awsApiRequestREST');
		awsApiRequestRESTAllItemsSpy = vi.spyOn(GenericFunctions, 'awsApiRequestRESTAllItems');
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

		executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 2 } as INode);
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.continueOnFail.mockReturnValue(false);

		executeFunctionsMock.helpers.returnJsonArray.mockImplementation((data) =>
			Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }],
		);

		executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as any,
		);
	});

	function setupSearchParams({ returnAll = false, delimiter = '', includeCommonPrefixes = false, limit = 100 }) {
		executeFunctionsMock.getNodeParameter.mockImplementation((paramName, _i, defaultVal?) => {
			switch (paramName) {
				case 'resource':
					return 'bucket';
				case 'operation':
					return 'search';
				case 'bucketName':
					return 'test-bucket';
				case 'returnAll':
					return returnAll;
				case 'limit':
					return limit;
				case 'additionalFields':
					return { delimiter, includeCommonPrefixes };
				default:
					return defaultVal ?? undefined;
			}
		});
	}

	it('should return contents', async () => {
		setupSearchParams({});
		awsApiRequestRESTSpy
			.mockResolvedValueOnce(mockLocationResponse)
			.mockResolvedValueOnce(mockSearchResponse);

		const result = await node.execute.call(executeFunctionsMock);

		expect(result[0][0].json).toEqual(mockContents[0]);
	});
});
