import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions, IWebhookFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { awsApiRequest, awsApiRequestREST, awsApiRequestSOAP } from '../GenericFunctions';

describe('AWS GenericFunctions', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	let mockWebhookFunctions: jest.Mocked<IWebhookFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockWebhookFunctions = mockDeep<IWebhookFunctions>();
		jest.clearAllMocks();

		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-base.aws',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('awsApiRequest', () => {
		describe('Successful Requests', () => {
			it('should make successful API request with basic parameters', async () => {
				const mockCredentials = {
					accessKeyId: 'test-access-key',
					secretAccessKey: 'test-secret-key',
					region: 'us-east-1',
				};
				const mockResponse = { success: true, data: 'test response' };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				const result = await awsApiRequest.call(
					mockExecuteFunctions,
					's3',
					'GET',
					'/test-path',
					undefined,
					{ 'Content-Type': 'application/json' },
				);

				expect(result).toEqual(mockResponse);
				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('aws');
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith('aws', {
					qs: {
						service: 's3',
						path: '/test-path',
					},
					method: 'GET',
					body: undefined,
					url: '',
					headers: { 'Content-Type': 'application/json' },
					region: 'us-east-1',
				});
			});

			it('should handle lambda service with raw body', async () => {
				const mockCredentials = {
					region: 'us-west-2',
				};
				const testBody = '{"test": "data"}';
				const mockResponse = { result: 'lambda response' };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				const result = await awsApiRequest.call(
					mockExecuteFunctions,
					'lambda',
					'POST',
					'/2015-03-31/functions/test/invocations',
					testBody,
				);

				expect(result).toEqual(mockResponse);
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith('aws', {
					qs: {
						service: 'lambda',
						path: '/2015-03-31/functions/test/invocations',
					},
					method: 'POST',
					body: testBody,
					url: '',
					headers: undefined,
					region: 'us-west-2',
				});
			});

			it('should stringify body for non-lambda services', async () => {
				const mockCredentials = { region: 'eu-central-1' };
				const testBody = { name: 'Test', value: 123 };
				const mockResponse = { success: true };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				await awsApiRequest.call(
					mockExecuteFunctions,
					's3',
					'PUT',
					'/bucket/object',
					testBody as any,
				);

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						body: JSON.stringify(testBody),
					}),
				);
			});

			it('should work with ILoadOptionsFunctions context', async () => {
				const mockCredentials = { region: 'ca-central-1' };
				const mockResponse = ['option1', 'option2'];

				mockLoadOptionsFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);
				mockLoadOptionsFunctions.getNode.mockReturnValue({
					id: 'load-node',
					name: 'Load Node',
					type: 'n8n-nodes-base.aws',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				const result = await awsApiRequest.call(
					mockLoadOptionsFunctions,
					'ec2',
					'GET',
					'/instances',
				);

				expect(result).toEqual(mockResponse);
			});

			it('should work with IWebhookFunctions context', async () => {
				const mockCredentials = { region: 'sa-east-1' };
				const mockResponse = { webhook: 'processed' };

				mockWebhookFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockWebhookFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);
				mockWebhookFunctions.getNode.mockReturnValue({
					id: 'webhook-node',
					name: 'Webhook Node',
					type: 'n8n-nodes-base.aws',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				const result = await awsApiRequest.call(
					mockWebhookFunctions,
					'apigateway',
					'GET',
					'/webhooks',
				);

				expect(result).toEqual(mockResponse);
			});

			it('should handle undefined body parameter', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const mockResponse = { success: true };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				await awsApiRequest.call(mockExecuteFunctions, 's3', 'GET', '/list-buckets');

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						body: undefined,
					}),
				);
			});

			it('should handle undefined headers parameter', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const mockResponse = { success: true };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				await awsApiRequest.call(mockExecuteFunctions, 's3', 'GET', '/list-buckets');

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						headers: undefined,
					}),
				);
			});
		});

		describe('Error Handling', () => {
			it('should handle credential retrieval errors', async () => {
				const credentialError = new Error('Failed to get AWS credentials');
				mockExecuteFunctions.getCredentials.mockRejectedValue(credentialError);

				await expect(
					awsApiRequest.call(mockExecuteFunctions, 's3', 'GET', '/test-path'),
				).rejects.toThrow('Failed to get AWS credentials');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('aws');
			});

			it('should wrap API errors in NodeApiError', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const apiError = new Error('AWS API Error');

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
					apiError,
				);

				await expect(
					awsApiRequest.call(mockExecuteFunctions, 's3', 'GET', '/test-path'),
				).rejects.toThrow(NodeApiError);

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalled();
			});

			it('should handle authentication errors', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const authError = {
					message: 'Invalid AWS credentials',
					statusCode: 403,
					response: { body: 'Forbidden' },
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
					authError,
				);

				await expect(
					awsApiRequest.call(mockExecuteFunctions, 's3', 'GET', '/test-path'),
				).rejects.toThrow(NodeApiError);
			});
		});

		describe('Edge Cases', () => {
			it('should handle empty service name', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const mockResponse = { success: true };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				await awsApiRequest.call(mockExecuteFunctions, '', 'GET', '/test');

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						qs: {
							service: '',
							path: '/test',
						},
					}),
				);
			});

			it('should handle null credentials region', async () => {
				const mockCredentials = { region: null };
				const mockResponse = { success: true };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				await awsApiRequest.call(mockExecuteFunctions, 's3', 'GET', '/test');

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						region: null,
					}),
				);
			});

			it('should handle various HTTP methods', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const mockResponse = { success: true };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

				for (const method of methods) {
					await awsApiRequest.call(mockExecuteFunctions, 's3', method, '/test');

					expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
						'aws',
						expect.objectContaining({
							method,
						}),
					);
				}

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(5);
			});
		});
	});

	describe('awsApiRequestREST', () => {
		describe('JSON Response Handling', () => {
			it('should parse valid JSON response', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const jsonResponse = '{"result": "success", "data": [1, 2, 3]}';
				const expectedParsed = { result: 'success', data: [1, 2, 3] };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					jsonResponse,
				);

				const result = await awsApiRequestREST.call(
					mockExecuteFunctions,
					'lambda',
					'POST',
					'/2015-03-31/functions/test/invocations',
					'{"test": "data"}',
				);

				expect(result).toEqual(expectedParsed);
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalled();
			});

			it('should return raw response when JSON parsing fails', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const invalidJsonResponse = 'Not valid JSON content';

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					invalidJsonResponse,
				);

				const result = await awsApiRequestREST.call(
					mockExecuteFunctions,
					's3',
					'GET',
					'/bucket/object.txt',
				);

				expect(result).toBe(invalidJsonResponse);
			});

			it('should handle empty string response', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const emptyResponse = '';

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					emptyResponse,
				);

				const result = await awsApiRequestREST.call(
					mockExecuteFunctions,
					'lambda',
					'POST',
					'/test',
				);

				expect(result).toBe(emptyResponse);
			});

			it('should handle null response', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const nullResponse = null;

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					nullResponse,
				);

				const result = await awsApiRequestREST.call(
					mockExecuteFunctions,
					's3',
					'DELETE',
					'/bucket',
				);

				expect(result).toBeNull();
			});

			it('should handle number response', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const numberResponse = 42;

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					numberResponse,
				);

				const result = await awsApiRequestREST.call(
					mockExecuteFunctions,
					'cloudwatch',
					'GET',
					'/metrics',
				);

				expect(result).toBe(numberResponse);
			});

			it('should handle boolean response', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const booleanResponse = true;

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					booleanResponse,
				);

				const result = await awsApiRequestREST.call(
					mockExecuteFunctions,
					's3',
					'HEAD',
					'/bucket/exists',
				);

				expect(result).toBe(booleanResponse);
			});

			it('should work with ILoadOptionsFunctions context', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const jsonResponse = '["option1", "option2", "option3"]';

				mockLoadOptionsFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					jsonResponse,
				);
				mockLoadOptionsFunctions.getNode.mockReturnValue({
					id: 'load-node',
					name: 'Load Node',
					type: 'n8n-nodes-base.aws',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				const result = await awsApiRequestREST.call(
					mockLoadOptionsFunctions,
					'ec2',
					'GET',
					'/instances',
				);

				expect(result).toEqual(['option1', 'option2', 'option3']);
			});
		});

		describe('Error Propagation', () => {
			it('should propagate errors from awsApiRequest', async () => {
				const apiError = new Error('API request failed');
				mockExecuteFunctions.getCredentials.mockRejectedValue(apiError);

				await expect(
					awsApiRequestREST.call(mockExecuteFunctions, 's3', 'GET', '/test'),
				).rejects.toThrow('API request failed');
			});

			it('should handle malformed JSON gracefully', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const malformedJson = '{"incomplete": json';

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					malformedJson,
				);

				const result = await awsApiRequestREST.call(
					mockExecuteFunctions,
					'lambda',
					'POST',
					'/test',
				);

				expect(result).toBe(malformedJson);
			});
		});
	});

	describe('awsApiRequestSOAP', () => {
		describe('XML Response Handling', () => {
			it('should parse valid XML response', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = '<response><status>success</status><data>test</data></response>';

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				const result = await awsApiRequestSOAP.call(
					mockExecuteFunctions,
					'ses',
					'POST',
					'/send-email',
					'<email>test</email>',
				);

				expect(result).toEqual({
					response: {
						status: 'success',
						data: 'test',
					},
				});
			});

			it('should return raw response when XML parsing fails', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const invalidXmlResponse = 'Not valid XML content';

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					invalidXmlResponse,
				);

				const result = await awsApiRequestSOAP.call(
					mockExecuteFunctions,
					'ses',
					'POST',
					'/send-email',
				);

				expect(result).toBe(invalidXmlResponse);
			});

			it('should handle empty XML response', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const emptyResponse = '';

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					emptyResponse,
				);

				const result = await awsApiRequestSOAP.call(mockExecuteFunctions, 'ses', 'GET', '/status');

				expect(result).toBeNull();
			});

			it('should handle complex nested XML with actual parsing', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const complexXml =
					'<ListQueuesResult><QueueUrl>url1</QueueUrl><QueueUrl>url2</QueueUrl></ListQueuesResult>';

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					complexXml,
				);

				const result = await awsApiRequestSOAP.call(
					mockExecuteFunctions,
					'sqs',
					'GET',
					'/list-queues',
				);

				expect(result).toEqual({
					ListQueuesResult: {
						QueueUrl: ['url1', 'url2'],
					},
				});
			});

			it('should work with different function contexts', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = '<options><item>opt1</item><item>opt2</item></options>';

				mockLoadOptionsFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);
				mockLoadOptionsFunctions.getNode.mockReturnValue({
					id: 'load-node',
					name: 'Load Node',
					type: 'n8n-nodes-base.aws',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				const result = await awsApiRequestSOAP.call(
					mockLoadOptionsFunctions,
					'ses',
					'GET',
					'/options',
				);

				expect(result).toEqual({
					options: {
						item: ['opt1', 'opt2'],
					},
				});
			});

			it('should propagate errors from awsApiRequest', async () => {
				const apiError = new Error('SOAP API request failed');
				mockExecuteFunctions.getCredentials.mockRejectedValue(apiError);

				await expect(
					awsApiRequestSOAP.call(mockExecuteFunctions, 'ses', 'POST', '/test'),
				).rejects.toThrow('SOAP API request failed');
			});
		});
	});
});
