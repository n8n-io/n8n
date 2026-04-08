import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { AwsLambda } from '../AwsLambda.node';
import * as GenericFunctions from '../GenericFunctions';

describe('AwsLambda', () => {
	let node: AwsLambda;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	const awsApiRequestRESTSpy = jest.spyOn(GenericFunctions, 'awsApiRequestREST');

	beforeEach(() => {
		node = new AwsLambda();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		jest.clearAllMocks();

		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node',
			name: 'AWS Lambda',
			type: 'n8n-nodes-base.awsLambda',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		(mockExecuteFunctions.helpers.constructExecutionMetaData as jest.Mock).mockImplementation(
			(data: any, meta: any) => {
				return [
					{
						...data[0],
						pairedItem: meta?.itemData?.item ?? 0,
					},
				];
			},
		);
		(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation((data: any) => [
			{ json: data },
		]);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Load Options Methods', () => {
		describe('getFunctions', () => {
			it('should load functions without pagination', async () => {
				const mockFunctions = {
					Functions: [
						{
							FunctionName: 'test-function-1',
							FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function-1',
						},
						{
							FunctionName: 'test-function-2',
							FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function-2',
						},
					],
				};

				awsApiRequestRESTSpy.mockResolvedValue(mockFunctions);

				const result = await node.methods.loadOptions.getFunctions.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{
						name: 'test-function-1',
						value: 'arn:aws:lambda:us-east-1:123456789012:function:test-function-1',
					},
					{
						name: 'test-function-2',
						value: 'arn:aws:lambda:us-east-1:123456789012:function:test-function-2',
					},
				]);
				expect(awsApiRequestRESTSpy).toHaveBeenCalledWith(
					'lambda',
					'GET',
					'/2015-03-31/functions/',
				);
			});

			it('should handle paginated function list', async () => {
				const mockFirstPage = {
					Functions: [
						{
							FunctionName: 'test-function-1',
							FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function-1',
						},
					],
					NextMarker: 'marker123',
				};

				const mockSecondPage = {
					Functions: [
						{
							FunctionName: 'test-function-2',
							FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function-2',
						},
					],
				};

				awsApiRequestRESTSpy
					.mockResolvedValueOnce(mockFirstPage)
					.mockResolvedValueOnce(mockSecondPage);

				const result = await node.methods.loadOptions.getFunctions.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{
						name: 'test-function-1',
						value: 'arn:aws:lambda:us-east-1:123456789012:function:test-function-1',
					},
					{
						name: 'test-function-2',
						value: 'arn:aws:lambda:us-east-1:123456789012:function:test-function-2',
					},
				]);
				expect(awsApiRequestRESTSpy).toHaveBeenCalledTimes(2);
				expect(awsApiRequestRESTSpy).toHaveBeenNthCalledWith(
					2,
					'lambda',
					'GET',
					'/2015-03-31/functions/?MaxItems=50&Marker=marker123',
				);
			});

			it('should handle multiple pages with NextMarker', async () => {
				const mockFirstPage = {
					Functions: [
						{
							FunctionName: 'function-1',
							FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:function-1',
						},
					],
					NextMarker: 'marker1',
				};

				const mockSecondPage = {
					Functions: [
						{
							FunctionName: 'function-2',
							FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:function-2',
						},
					],
					NextMarker: 'marker2',
				};

				const mockThirdPage = {
					Functions: [
						{
							FunctionName: 'function-3',
							FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:function-3',
						},
					],
				};

				awsApiRequestRESTSpy
					.mockResolvedValueOnce(mockFirstPage)
					.mockResolvedValueOnce(mockSecondPage)
					.mockResolvedValueOnce(mockThirdPage);

				const result = await node.methods.loadOptions.getFunctions.call(mockLoadOptionsFunctions);

				expect(result).toHaveLength(3);
				expect(awsApiRequestRESTSpy).toHaveBeenCalledTimes(3);
				expect(awsApiRequestRESTSpy).toHaveBeenNthCalledWith(
					3,
					'lambda',
					'GET',
					'/2015-03-31/functions/?MaxItems=50&Marker=marker2',
				);
			});

			it('should handle empty function list', async () => {
				const mockEmptyResponse = {
					Functions: [],
				};

				awsApiRequestRESTSpy.mockResolvedValue(mockEmptyResponse);

				const result = await node.methods.loadOptions.getFunctions.call(mockLoadOptionsFunctions);

				expect(result).toEqual([]);
				expect(awsApiRequestRESTSpy).toHaveBeenCalledWith(
					'lambda',
					'GET',
					'/2015-03-31/functions/',
				);
			});
		});
	});

	describe('Execute Method', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
				const mockParams = {
					operation: 'invoke',
					function: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
					qualifier: '$LATEST',
					invocationType: 'RequestResponse',
					payload: JSON.stringify({ test: 'data' }),
				};
				return mockParams[paramName as keyof typeof mockParams];
			});
		});

		describe('Successful Lambda Invocation', () => {
			it('should invoke lambda function with RequestResponse type', async () => {
				const mockResponse = {
					StatusCode: 200,
					result: { success: true, data: 'processed' },
				};

				awsApiRequestRESTSpy.mockResolvedValue(mockResponse);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result).toEqual([
					[
						{
							json: [
								{
									json: { result: mockResponse },
									pairedItem: 0,
								},
							],
						},
					],
				]);
				expect(awsApiRequestRESTSpy).toHaveBeenCalledWith(
					'lambda',
					'POST',
					'/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:test-function/invocations?Qualifier=$LATEST',
					JSON.stringify({ test: 'data' }),
					{
						'X-Amz-Invocation-Type': 'RequestResponse',
						'Content-Type': 'application/x-amz-json-1.0',
					},
				);
			});

			it('should invoke lambda function with Event type', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					const mockParams = {
						operation: 'invoke',
						function: 'test-function',
						qualifier: 'PROD',
						invocationType: 'Event',
						payload: JSON.stringify({ async: true }),
					};
					return mockParams[paramName as keyof typeof mockParams];
				});

				const mockResponse = {
					StatusCode: 202,
				};

				awsApiRequestRESTSpy.mockResolvedValue(mockResponse);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result).toEqual([
					[
						{
							json: [
								{
									json: { result: mockResponse },
									pairedItem: 0,
								},
							],
						},
					],
				]);
				expect(awsApiRequestRESTSpy).toHaveBeenCalledWith(
					'lambda',
					'POST',
					'/2015-03-31/functions/test-function/invocations?Qualifier=PROD',
					JSON.stringify({ async: true }),
					{
						'X-Amz-Invocation-Type': 'Event',
						'Content-Type': 'application/x-amz-json-1.0',
					},
				);
			});

			it('should handle empty payload', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					const mockParams = {
						operation: 'invoke',
						function: 'test-function',
						qualifier: '$LATEST',
						invocationType: 'RequestResponse',
						payload: '',
					};
					return mockParams[paramName as keyof typeof mockParams];
				});

				const mockResponse = { result: 'success' };
				awsApiRequestRESTSpy.mockResolvedValue(mockResponse);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result).toEqual([
					[
						{
							json: [
								{
									json: { result: mockResponse },
									pairedItem: 0,
								},
							],
						},
					],
				]);
				expect(awsApiRequestRESTSpy).toHaveBeenCalledWith(
					'lambda',
					'POST',
					'/2015-03-31/functions/test-function/invocations?Qualifier=$LATEST',
					'',
					{
						'X-Amz-Invocation-Type': 'RequestResponse',
						'Content-Type': 'application/x-amz-json-1.0',
					},
				);
			});

			it('should process multiple input items', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([
					{ json: { item: 1 } },
					{ json: { item: 2 } },
				]);
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName, itemIndex) => {
					const mockParams = {
						operation: 'invoke',
						function: 'test-function',
						qualifier: '$LATEST',
						invocationType: 'RequestResponse',
						payload: JSON.stringify({ item: itemIndex + 1 }),
					};
					return mockParams[paramName as keyof typeof mockParams];
				});

				const mockResponse1 = { result: 'item1-processed' };
				const mockResponse2 = { result: 'item2-processed' };
				awsApiRequestRESTSpy
					.mockResolvedValueOnce(mockResponse1)
					.mockResolvedValueOnce(mockResponse2);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json).toHaveLength(2);
				expect(result[0][0].json[0]).toEqual({ json: { result: mockResponse1 }, pairedItem: 0 });
				expect(result[0][0].json[1]).toEqual({ json: { result: mockResponse2 }, pairedItem: 1 });
				expect(awsApiRequestRESTSpy).toHaveBeenCalledTimes(2);
			});
		});

		describe('Lambda Function Errors', () => {
			it('should handle lambda function execution errors', async () => {
				const mockErrorResponse = {
					errorMessage: 'Function execution failed',
					errorType: 'Runtime.HandlerNotFound',
					stackTrace: ['at /var/task/index.js:10:5'],
				};

				awsApiRequestRESTSpy.mockResolvedValue(mockErrorResponse);

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeApiError);
				expect(awsApiRequestRESTSpy).toHaveBeenCalledWith(
					'lambda',
					'POST',
					'/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:test-function/invocations?Qualifier=$LATEST',
					JSON.stringify({ test: 'data' }),
					{
						'X-Amz-Invocation-Type': 'RequestResponse',
						'Content-Type': 'application/x-amz-json-1.0',
					},
				);
			});

			it('should handle API errors when continueOnFail is true', async () => {
				const apiError = new Error('Function not found');
				mockExecuteFunctions.continueOnFail.mockReturnValue(true);
				awsApiRequestRESTSpy.mockRejectedValue(apiError);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result).toEqual([
					[
						{
							json: [
								{
									json: { error: 'Function not found' },
									pairedItem: 0,
								},
							],
						},
					],
				]);
			});

			it('should throw API errors when continueOnFail is false', async () => {
				const apiError = new Error('Invalid function name');
				mockExecuteFunctions.continueOnFail.mockReturnValue(false);
				awsApiRequestRESTSpy.mockRejectedValue(apiError);

				await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
					'Invalid function name',
				);
			});

			it('should handle mixed success and error scenarios with continueOnFail', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([
					{ json: { item: 1 } },
					{ json: { item: 2 } },
					{ json: { item: 3 } },
				]);
				mockExecuteFunctions.continueOnFail.mockReturnValue(true);

				const mockSuccessResponse = { result: 'success' };
				const apiError = new Error('Function error');

				awsApiRequestRESTSpy
					.mockResolvedValueOnce(mockSuccessResponse)
					.mockRejectedValueOnce(apiError)
					.mockResolvedValueOnce(mockSuccessResponse);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json).toHaveLength(3);
				expect(result[0][0].json[0]).toEqual({
					json: { result: mockSuccessResponse },
					pairedItem: 0,
				});
				expect(result[0][0].json[1]).toEqual({ json: { error: 'Function error' }, pairedItem: 1 });
				expect(result[0][0].json[2]).toEqual({
					json: { result: mockSuccessResponse },
					pairedItem: 2,
				});
			});
		});

		describe('Different Qualifier Values', () => {
			it('should handle custom version qualifier', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					const mockParams = {
						operation: 'invoke',
						function: 'test-function',
						qualifier: '1',
						invocationType: 'RequestResponse',
						payload: JSON.stringify({ version: 1 }),
					};
					return mockParams[paramName as keyof typeof mockParams];
				});

				const mockResponse = { result: 'version-1-response' };
				awsApiRequestRESTSpy.mockResolvedValue(mockResponse);

				await node.execute.call(mockExecuteFunctions);

				expect(awsApiRequestRESTSpy).toHaveBeenCalledWith(
					'lambda',
					'POST',
					'/2015-03-31/functions/test-function/invocations?Qualifier=1',
					JSON.stringify({ version: 1 }),
					{
						'X-Amz-Invocation-Type': 'RequestResponse',
						'Content-Type': 'application/x-amz-json-1.0',
					},
				);
			});

			it('should handle alias qualifier', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					const mockParams = {
						operation: 'invoke',
						function: 'test-function',
						qualifier: 'PROD',
						invocationType: 'RequestResponse',
						payload: JSON.stringify({ environment: 'production' }),
					};
					return mockParams[paramName as keyof typeof mockParams];
				});

				const mockResponse = { result: 'prod-response' };
				awsApiRequestRESTSpy.mockResolvedValue(mockResponse);

				await node.execute.call(mockExecuteFunctions);

				expect(awsApiRequestRESTSpy).toHaveBeenCalledWith(
					'lambda',
					'POST',
					'/2015-03-31/functions/test-function/invocations?Qualifier=PROD',
					JSON.stringify({ environment: 'production' }),
					{
						'X-Amz-Invocation-Type': 'RequestResponse',
						'Content-Type': 'application/x-amz-json-1.0',
					},
				);
			});
		});

		describe('Payload Handling', () => {
			it('should handle complex JSON payload', async () => {
				const complexPayload = {
					user: { id: 123, name: 'John Doe' },
					data: [1, 2, 3],
					metadata: { timestamp: '2023-01-01T00:00:00Z' },
				};

				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					const mockParams = {
						operation: 'invoke',
						function: 'test-function',
						qualifier: '$LATEST',
						invocationType: 'RequestResponse',
						payload: JSON.stringify(complexPayload),
					};
					return mockParams[paramName as keyof typeof mockParams];
				});

				const mockResponse = { result: 'complex-processed' };
				awsApiRequestRESTSpy.mockResolvedValue(mockResponse);

				await node.execute.call(mockExecuteFunctions);

				expect(awsApiRequestRESTSpy).toHaveBeenCalledWith(
					'lambda',
					'POST',
					'/2015-03-31/functions/test-function/invocations?Qualifier=$LATEST',
					JSON.stringify(complexPayload),
					{
						'X-Amz-Invocation-Type': 'RequestResponse',
						'Content-Type': 'application/x-amz-json-1.0',
					},
				);
			});

			it('should handle string payload', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName) => {
					const mockParams = {
						operation: 'invoke',
						function: 'test-function',
						qualifier: '$LATEST',
						invocationType: 'RequestResponse',
						payload: 'plain string payload',
					};
					return mockParams[paramName as keyof typeof mockParams];
				});

				const mockResponse = { result: 'string-processed' };
				awsApiRequestRESTSpy.mockResolvedValue(mockResponse);

				await node.execute.call(mockExecuteFunctions);

				expect(awsApiRequestRESTSpy).toHaveBeenCalledWith(
					'lambda',
					'POST',
					'/2015-03-31/functions/test-function/invocations?Qualifier=$LATEST',
					'plain string payload',
					{
						'X-Amz-Invocation-Type': 'RequestResponse',
						'Content-Type': 'application/x-amz-json-1.0',
					},
				);
			});
		});

		describe('Edge Cases', () => {
			it('should handle null response from Lambda', async () => {
				awsApiRequestRESTSpy.mockResolvedValue(null);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result).toEqual([
					[
						{
							json: [
								{
									json: { result: null },
									pairedItem: 0,
								},
							],
						},
					],
				]);
			});

			it('should handle undefined response from Lambda', async () => {
				awsApiRequestRESTSpy.mockResolvedValue(undefined);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result).toEqual([
					[
						{
							json: [
								{
									json: { result: undefined },
									pairedItem: 0,
								},
							],
						},
					],
				]);
			});

			it('should handle empty input data', async () => {
				mockExecuteFunctions.getInputData.mockReturnValue([]);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(result).toEqual([
					[
						{
							json: [],
						},
					],
				]);
				expect(awsApiRequestRESTSpy).not.toHaveBeenCalled();
			});
		});
	});
});
