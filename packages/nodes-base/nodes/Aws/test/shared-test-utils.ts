/**
 * Shared test utilities for AWS nodes to reduce test code duplication
 *
 * This module provides reusable test patterns for common AWS generic functions
 * that are shared across multiple AWS service nodes (S3, ELB, SES, etc.)
 */

import { mockDeep } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	IHttpRequestMethods,
	IDataObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export type AwsContextType =
	| IExecuteFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IWebhookFunctions;

export type AwsRESTContextType = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions;

type AwsApiRequestFunction = (
	this: AwsContextType,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string | Buffer,
	query?: IDataObject,
	headers?: object,
	_option?: IDataObject,
	_region?: string,
) => Promise<any>;

type AwsApiRequestRESTFunction = (
	this: AwsRESTContextType,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string,
	query?: IDataObject,
	headers?: object,
	options?: IDataObject,
	region?: string,
) => Promise<any>;

type AwsApiRequestSOAPFunction = (
	this: AwsContextType,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string | Buffer,
	query?: IDataObject,
	headers?: object,
	option?: IDataObject,
	region?: string,
) => Promise<any>;

/**
 * Creates a comprehensive test suite for awsApiRequest function
 * Used by AWS nodes that implement the standard awsApiRequest pattern
 */
export function createAwsApiRequestTests(
	awsApiRequestFunction: AwsApiRequestFunction,
	serviceName: string = 'testService',
) {
	return () => {
		let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
		let mockHookFunctions: jest.Mocked<IHookFunctions>;
		let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
		let mockWebhookFunctions: jest.Mocked<IWebhookFunctions>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			mockHookFunctions = mockDeep<IHookFunctions>();
			mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
			mockWebhookFunctions = mockDeep<IWebhookFunctions>();
			jest.clearAllMocks();

			// Setup common node mock
			const position: [number, number] = [0, 0];
			const nodeConfig = {
				id: 'test-node',
				name: `Test ${serviceName.toUpperCase()} Node`,
				type: `n8n-nodes-base.aws${serviceName}`,
				typeVersion: 1,
				position,
				parameters: {},
			};
			mockExecuteFunctions.getNode.mockReturnValue(nodeConfig);
			mockHookFunctions.getNode.mockReturnValue(nodeConfig);
			mockLoadOptionsFunctions.getNode.mockReturnValue(nodeConfig);
			mockWebhookFunctions.getNode.mockReturnValue(nodeConfig);
		});

		describe('Successful Requests', () => {
			it('should make successful API request with basic parameters', async () => {
				const mockResponse = { success: true };
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				const result = await awsApiRequestFunction.call(
					mockExecuteFunctions,
					serviceName,
					'GET',
					'/test-path',
				);

				expect(result).toEqual(mockResponse);
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						qs: expect.objectContaining({
							service: serviceName,
							path: '/test-path',
						}),
						method: 'GET',
					}),
				);
			});

			it('should handle string body parameter', async () => {
				const mockResponse = { data: 'test' };
				const testBody = 'test body content';
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				await awsApiRequestFunction.call(
					mockExecuteFunctions,
					serviceName,
					'POST',
					'/test-path',
					testBody,
				);

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						body: testBody,
						method: 'POST',
					}),
				);
			});

			it('should handle buffer body parameter', async () => {
				const mockResponse = { success: true };
				const bufferBody = Buffer.from('test buffer');
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				await awsApiRequestFunction.call(
					mockExecuteFunctions,
					serviceName,
					'PUT',
					'/test-path',
					bufferBody,
				);

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						body: bufferBody,
						method: 'PUT',
					}),
				);
			});

			it('should work with IHookFunctions context', async () => {
				const mockResponse = { success: true };
				(mockHookFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				const result = await awsApiRequestFunction.call(
					mockHookFunctions,
					serviceName,
					'GET',
					'/test-path',
				);

				expect(result).toEqual(mockResponse);
			});

			it('should work with ILoadOptionsFunctions context', async () => {
				const mockResponse = { options: [] };
				(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				const result = await awsApiRequestFunction.call(
					mockLoadOptionsFunctions,
					serviceName,
					'GET',
					'/options',
				);

				expect(result).toEqual(mockResponse);
			});

			it('should work with IWebhookFunctions context', async () => {
				const mockResponse = { webhookData: true };
				(mockWebhookFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				const result = await awsApiRequestFunction.call(
					mockWebhookFunctions,
					serviceName,
					'POST',
					'/webhook',
				);

				expect(result).toEqual(mockResponse);
			});
		});

		describe('Error Handling', () => {
			it('should handle credential retrieval errors', async () => {
				const credentialError = new Error('Credential not found');
				mockExecuteFunctions.getCredentials.mockRejectedValue(credentialError);

				await expect(
					awsApiRequestFunction.call(mockExecuteFunctions, serviceName, 'GET', '/test-path'),
				).rejects.toThrow('Credential not found');
			});

			it('should wrap API errors in NodeApiError', async () => {
				const apiError = new Error('API Error');
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
					apiError,
				);

				await expect(
					awsApiRequestFunction.call(mockExecuteFunctions, serviceName, 'GET', '/test-path'),
				).rejects.toThrow(NodeApiError);
			});
		});
	};
}

/**
 * Creates a comprehensive test suite for awsApiRequestREST function
 */
export function createAwsApiRequestRESTTests(
	awsApiRequestRESTFunction: AwsApiRequestRESTFunction,
	serviceName: string = 'testService',
) {
	return () => {
		let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			jest.clearAllMocks();
		});

		describe('JSON Response Handling', () => {
			it('should parse valid JSON response', async () => {
				const jsonResponse = '{"result": "success", "data": [1,2,3]}';
				const expectedResult = { result: 'success', data: [1, 2, 3] };
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					jsonResponse,
				);

				const result = await awsApiRequestRESTFunction.call(
					mockExecuteFunctions,
					serviceName,
					'GET',
					'/test-path',
				);

				expect(result).toEqual(expectedResult);
			});

			it('should return raw response when JSON parsing fails', async () => {
				const rawResponse = 'not json data';
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					rawResponse,
				);

				const result = await awsApiRequestRESTFunction.call(
					mockExecuteFunctions,
					serviceName,
					'GET',
					'/test-path',
				);

				expect(result).toBe(rawResponse);
			});
		});
	};
}

/**
 * Creates a comprehensive test suite for awsApiRequestSOAP function
 * Note: This creates basic structure - individual tests should handle their own XML mocking
 */
export function createAwsApiRequestSOAPTests(
	awsApiRequestSOAPFunction: AwsApiRequestSOAPFunction,
	serviceName: string = 'testService',
) {
	return () => {
		let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			jest.clearAllMocks();
		});

		describe('Basic SOAP functionality', () => {
			it('should call awsApiRequest for SOAP requests', async () => {
				// This is a basic test that SOAP function calls the underlying API request
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					'<response>test</response>',
				);

				// Since SOAP parsing is complex and service-specific, we expect this to fail
				// This just verifies the function attempts to call the underlying request
				await expect(
					awsApiRequestSOAPFunction.call(mockExecuteFunctions, serviceName, 'GET', '/test-path'),
				).rejects.toThrow();

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalled();
			});
		});
	};
}
