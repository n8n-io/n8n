import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { AwsS3V1 } from '../../V1/AwsS3V1.node';
import type { MockInstance } from 'vitest';
import * as GenericFunctions from '../../V1/GenericFunctions';

describe('AWS S3 V1 Node - Get Presigned URL', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	let awsApiRequestSOAPSpy: MockInstance;
	let node: AwsS3V1;

	beforeEach(() => {
		vi.resetAllMocks();
		awsApiRequestSOAPSpy = vi.spyOn(GenericFunctions, 'awsApiRequestSOAP');
		node = new AwsS3V1({
			displayName: 'AWS S3',
			name: 'awsS3',
			icon: 'file:s3.svg',
			group: ['output'],
			description: 'Sends data to AWS S3',
		});

		executeFunctionsMock.getNode.mockReturnValue({
			typeVersion: 1,
		} as INode);

		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.continueOnFail.mockReturnValue(false);

		executeFunctionsMock.helpers.returnJsonArray.mockImplementation((data) =>
			Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }],
		);
		executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as any,
		);
	});

	it('should generate a presigned URL using standard AWS credentials', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: 'us-east-1',
		});

		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'file';
				case 'operation':
					return 'getPresignedUrl';
				case 'bucketName':
					return 'my-bucket';
				case 'fileKey':
					return 'my-file.txt';
				case 'additionalFields':
					return { expires: 3600 };
				default:
					return undefined;
			}
		});

		const result = await node.execute.call(executeFunctionsMock);
		expect(result[0][0].json).toHaveProperty('url');
		expect(result[0][0].json.url).toContain('my-bucket.s3.us-east-1.amazonaws.com/my-file.txt');
	});

	it('should handle bucket names with dots', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: 'us-east-1',
		});

		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'file';
				case 'operation':
					return 'getPresignedUrl';
				case 'bucketName':
					return 'my.bucket';
				case 'fileKey':
					return 'file.txt';
				case 'additionalFields':
					return { expires: 3600 };
				default:
					return undefined;
			}
		});

		const result = await node.execute.call(executeFunctionsMock);
		expect(result[0][0].json.url).toContain('my.bucket.s3.us-east-1.amazonaws.com/file.txt');
	});

	it('should encode file key with special characters', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: 'us-east-1',
		});

		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'file';
				case 'operation':
					return 'getPresignedUrl';
				case 'bucketName':
					return 'my-bucket';
				case 'fileKey':
					return 'folder/my file?.txt';
				case 'additionalFields':
					return { expires: 3600 };
				default:
					return undefined;
			}
		});

		const result = await node.execute.call(executeFunctionsMock);
		expect(result[0][0].json.url).toContain('folder/my%20file%3F.txt');
	});
});
