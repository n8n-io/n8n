import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import nock from 'nock';

import { AwsRekognition } from '../AwsRekognition.node';
import * as GenericFunctions from '../GenericFunctions';

const mockRekognitionResponse = {
	CelebrityFaces: [
		{
			Name: 'Test Celebrity',
			MatchConfidence: 99.9,
		},
	],
};

describe('AWS Rekognition Node - binary data input', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	let awsApiRequestSpy: jest.SpyInstance;
	const node = new AwsRekognition();

	beforeEach(() => {
		jest.resetAllMocks();
		awsApiRequestSpy = jest.spyOn(GenericFunctions, 'awsApiRequestREST');
		executeFunctionsMock.getCredentials.mockResolvedValue({
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: 'us-east-1',
		});
		executeFunctionsMock.getNode.mockReturnValue({
			typeVersion: 1,
		} as INode);
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.continueOnFail.mockReturnValue(false);
		executeFunctionsMock.helpers.returnJsonArray.mockImplementation((data) =>
			Array.isArray(data) ? data.map((item: any) => ({ json: item })) : ([{ json: data }] as any),
		);
		executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as any,
		);
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('analyze operation with Binary File = on', () => {
		beforeEach(() => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'resource':
						return 'image';
					case 'operation':
						return 'analyze';
					case 'type':
						return 'recognizeCelebrity';
					case 'additionalFields':
						return {};
					case 'binaryData':
						return true;
					case 'binaryPropertyName':
						return 'data';
					default:
						return undefined;
				}
			});
		});

		it('should read binary data through getBinaryDataBuffer and send base64-encoded Bytes', async () => {
			const testImageBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(testImageBuffer);
			awsApiRequestSpy.mockResolvedValue(mockRekognitionResponse);

			await node.execute.call(executeFunctionsMock);

			expect(executeFunctionsMock.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
			expect(awsApiRequestSpy).toHaveBeenCalledWith(
				'rekognition',
				'POST',
				'',
				JSON.stringify({
					Filters: {},
					Image: {
						Bytes: testImageBuffer.toString('base64'),
					},
				}),
				{},
				{
					'X-Amz-Target': 'RekognitionService.RecognizeCelebrities',
					'Content-Type': 'application/x-amz-json-1.1',
				},
			);
		});

		it('should populate Bytes regardless of whether IBinaryData.data is in memory', async () => {
			const testImageBuffer = Buffer.from('image-payload-from-filesystem');

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(testImageBuffer);
			awsApiRequestSpy.mockResolvedValue(mockRekognitionResponse);

			await node.execute.call(executeFunctionsMock);

			const sentBody = jsonParse<{ Image: Record<string, unknown> }>(
				awsApiRequestSpy.mock.calls[0][3] as string,
			);
			expect(sentBody.Image.Bytes).toBe(testImageBuffer.toString('base64'));
			expect(sentBody.Image.Bytes).not.toBe('');
		});

		it('should resolve a custom binary property name', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'resource':
						return 'image';
					case 'operation':
						return 'analyze';
					case 'type':
						return 'detectFaces';
					case 'additionalFields':
						return {};
					case 'binaryData':
						return true;
					case 'binaryPropertyName':
						return 'document';
					default:
						return undefined;
				}
			});

			const testImageBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(testImageBuffer);
			awsApiRequestSpy.mockResolvedValue(mockRekognitionResponse);

			await node.execute.call(executeFunctionsMock);

			expect(executeFunctionsMock.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'document');
		});
	});

	describe('analyze operation with Binary File = off', () => {
		it('should send S3Object without touching binary helpers', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'resource':
						return 'image';
					case 'operation':
						return 'analyze';
					case 'type':
						return 'detectLabels';
					case 'additionalFields':
						return {};
					case 'binaryData':
						return false;
					case 'bucket':
						return 'my-bucket';
					case 'name':
						return 'my-image.jpg';
					default:
						return undefined;
				}
			});

			awsApiRequestSpy.mockResolvedValue(mockRekognitionResponse);

			await node.execute.call(executeFunctionsMock);

			expect(executeFunctionsMock.helpers.getBinaryDataBuffer).not.toHaveBeenCalled();
			const sentBody = jsonParse<{ Image: Record<string, unknown> }>(
				awsApiRequestSpy.mock.calls[0][3] as string,
			);
			expect(sentBody.Image).toEqual({
				S3Object: {
					Bucket: 'my-bucket',
					Name: 'my-image.jpg',
				},
			});
		});
	});
});
