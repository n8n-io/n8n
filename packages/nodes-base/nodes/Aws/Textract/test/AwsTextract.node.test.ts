import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import nock from 'nock';

import { AwsTextract } from '../AwsTextract.node';
import * as GenericFunctions from '../GenericFunctions';

const mockTextractResponse = {
	ExpenseDocuments: [
		{
			SummaryFields: [
				{
					Type: {
						Text: 'VENDOR_NAME',
					},
					ValueDetection: {
						Text: 'Test Company',
					},
				},
			],
		},
	],
};

const mockSimplifiedResponse = {
	VENDOR_NAME: 'Test Company',
};

describe('AWS Textract Node', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const awsApiRequestSpy = jest.spyOn(GenericFunctions, 'awsApiRequestREST');
	const simplifySpy = jest.spyOn(GenericFunctions, 'simplify');
	const node = new AwsTextract();

	beforeEach(() => {
		jest.resetAllMocks();
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
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('analyzeExpense operation', () => {
		beforeEach(() => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'operation':
						return 'analyzeExpense';
					case 'binaryPropertyName':
						return 'data';
					case 'simple':
						return true;
					default:
						return undefined;
				}
			});
		});

		it('should process binary image data and return simplified response', async () => {
			const testImageBuffer = Buffer.from('test-image-data');

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(testImageBuffer);
			awsApiRequestSpy.mockResolvedValue(mockTextractResponse);
			simplifySpy.mockReturnValue(mockSimplifiedResponse);

			const result = await node.execute.call(executeFunctionsMock);

			expect(executeFunctionsMock.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
			expect(awsApiRequestSpy).toHaveBeenCalledWith(
				'textract',
				'POST',
				'',
				JSON.stringify({
					Document: {
						Bytes: testImageBuffer.toString('base64'),
					},
				}),
				{
					'x-amz-target': 'Textract.AnalyzeExpense',
					'Content-Type': 'application/x-amz-json-1.1',
				},
			);
			expect(simplifySpy).toHaveBeenCalledWith(mockTextractResponse);
			expect(result).toEqual([[{ json: mockSimplifiedResponse }]]);
		});

		it('should return raw response when simple is false', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'operation':
						return 'analyzeExpense';
					case 'binaryPropertyName':
						return 'data';
					case 'simple':
						return false;
					default:
						return undefined;
				}
			});

			const testImageBuffer = Buffer.from('test-image-data');

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(testImageBuffer);
			awsApiRequestSpy.mockResolvedValue(mockTextractResponse);

			const result = await node.execute.call(executeFunctionsMock);

			expect(simplifySpy).not.toHaveBeenCalled();
			expect(result).toEqual([[{ json: mockTextractResponse }]]);
		});

		it('should handle different binary property names', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
				switch (paramName) {
					case 'operation':
						return 'analyzeExpense';
					case 'binaryPropertyName':
						return 'document';
					case 'simple':
						return true;
					default:
						return undefined;
				}
			});

			const testImageBuffer = Buffer.from('test-document-data');

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(testImageBuffer);
			awsApiRequestSpy.mockResolvedValue(mockTextractResponse);
			simplifySpy.mockReturnValue(mockSimplifiedResponse);

			const result = await node.execute.call(executeFunctionsMock);

			expect(executeFunctionsMock.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'document');
			expect(result).toEqual([[{ json: mockSimplifiedResponse }]]);
		});

		it('should handle JPEG images', async () => {
			const testJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG header bytes

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(testJpegBuffer);
			awsApiRequestSpy.mockResolvedValue(mockTextractResponse);
			simplifySpy.mockReturnValue(mockSimplifiedResponse);

			const result = await node.execute.call(executeFunctionsMock);

			expect(awsApiRequestSpy).toHaveBeenCalledWith(
				'textract',
				'POST',
				'',
				JSON.stringify({
					Document: {
						Bytes: testJpegBuffer.toString('base64'),
					},
				}),
				{
					'x-amz-target': 'Textract.AnalyzeExpense',
					'Content-Type': 'application/x-amz-json-1.1',
				},
			);
			expect(result).toEqual([[{ json: mockSimplifiedResponse }]]);
		});

		it('should handle PNG images', async () => {
			const testPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG header bytes

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(testPngBuffer);
			awsApiRequestSpy.mockResolvedValue(mockTextractResponse);
			simplifySpy.mockReturnValue(mockSimplifiedResponse);

			const result = await node.execute.call(executeFunctionsMock);

			expect(result).toEqual([[{ json: mockSimplifiedResponse }]]);
		});

		it('should handle multiple input items', async () => {
			executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);

			const testImageBuffer = Buffer.from('test-image-data');

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(testImageBuffer);
			awsApiRequestSpy.mockResolvedValue(mockTextractResponse);
			simplifySpy.mockReturnValue(mockSimplifiedResponse);

			const result = await node.execute.call(executeFunctionsMock);

			expect(executeFunctionsMock.helpers.getBinaryDataBuffer).toHaveBeenCalledTimes(2);
			expect(awsApiRequestSpy).toHaveBeenCalledTimes(2);
			expect(result).toEqual([
				[{ json: mockSimplifiedResponse }, { json: mockSimplifiedResponse }],
			]);
		});

		it('should handle errors and continue on fail', async () => {
			executeFunctionsMock.continueOnFail.mockReturnValue(true);
			executeFunctionsMock.helpers.getBinaryDataBuffer.mockRejectedValue(
				new Error('Binary data not found'),
			);

			const result = await node.execute.call(executeFunctionsMock);

			expect(result).toEqual([[{ json: { error: 'Binary data not found' } }]]);
		});

		it('should throw error when continueOnFail is false', async () => {
			executeFunctionsMock.continueOnFail.mockReturnValue(false);
			executeFunctionsMock.helpers.getBinaryDataBuffer.mockRejectedValue(
				new Error('Binary data not found'),
			);

			await expect(node.execute.call(executeFunctionsMock)).rejects.toThrow(
				'Binary data not found',
			);
		});

		it('should handle empty binary data', async () => {
			const emptyBuffer = Buffer.from('');

			executeFunctionsMock.helpers.getBinaryDataBuffer.mockResolvedValue(emptyBuffer);
			awsApiRequestSpy.mockResolvedValue(mockTextractResponse);
			simplifySpy.mockReturnValue(mockSimplifiedResponse);

			await node.execute.call(executeFunctionsMock);

			expect(awsApiRequestSpy).toHaveBeenCalledWith(
				'textract',
				'POST',
				'',
				JSON.stringify({
					Document: {
						Bytes: '',
					},
				}),
				{
					'x-amz-target': 'Textract.AnalyzeExpense',
					'Content-Type': 'application/x-amz-json-1.1',
				},
			);
		});
	});
});
