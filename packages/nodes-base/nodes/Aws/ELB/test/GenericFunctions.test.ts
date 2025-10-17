import get from 'lodash/get';
import { mockDeep } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import {
	awsApiRequest,
	awsApiRequestREST,
	awsApiRequestSOAP,
	awsApiRequestSOAPAllItems,
} from '../GenericFunctions';

jest.mock('xml2js', () => ({
	parseString: jest.fn(),
}));

jest.mock('lodash/get', () => jest.fn());

import { parseString as parseXml } from 'xml2js';

describe('ELB GenericFunctions', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockHookFunctions: jest.Mocked<IHookFunctions>;
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	let mockWebhookFunctions: jest.Mocked<IWebhookFunctions>;
	const mockParseXml = parseXml as jest.MockedFunction<typeof parseXml>;
	const mockGet = get as jest.MockedFunction<any>;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockHookFunctions = mockDeep<IHookFunctions>();
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockWebhookFunctions = mockDeep<IWebhookFunctions>();
		jest.clearAllMocks();

		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test ELB Node',
			type: 'n8n-nodes-base.awsElb',
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
				const mockResponse = { success: true, data: 'elb response' };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				const result = await awsApiRequest.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'GET',
					'/test-path',
				);

				expect(result).toEqual(mockResponse);
				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('aws');
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith('aws', {
					qs: {
						service: 'elasticloadbalancing',
						path: '/test-path',
					},
					headers: undefined,
					method: 'GET',
					url: '',
					body: undefined,
					region: 'us-east-1',
				});
			});

			it('should handle string body parameter', async () => {
				const mockCredentials = { region: 'us-west-2' };
				const testBody = 'test body content';
				const mockResponse = { result: 'elb response' };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				const result = await awsApiRequest.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'POST',
					'/create-load-balancer',
					testBody,
				);

				expect(result).toEqual(mockResponse);
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith('aws', {
					qs: {
						service: 'elasticloadbalancing',
						path: '/create-load-balancer',
					},
					headers: undefined,
					method: 'POST',
					url: '',
					body: testBody,
					region: 'us-west-2',
				});
			});

			it('should handle buffer body parameter', async () => {
				const mockCredentials = { region: 'eu-central-1' };
				const testBody = Buffer.from('test buffer content');
				const mockResponse = { success: true };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				await awsApiRequest.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'PUT',
					'/modify-load-balancer',
					testBody,
				);

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						body: testBody,
					}),
				);
			});

			it('should work with IHookFunctions context', async () => {
				const mockCredentials = { region: 'ap-southeast-1' };
				const mockResponse = { hookResponse: true };

				mockHookFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockHookFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);
				mockHookFunctions.getNode.mockReturnValue({
					id: 'hook-node',
					name: 'Hook ELB Node',
					type: 'n8n-nodes-base.awsElb',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				const result = await awsApiRequest.call(
					mockHookFunctions,
					'elasticloadbalancing',
					'POST',
					'/register-target',
					'hook-body',
				);

				expect(result).toEqual(mockResponse);
				expect(mockHookFunctions.getCredentials).toHaveBeenCalledWith('aws');
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
					name: 'Load ELB Node',
					type: 'n8n-nodes-base.awsElb',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				const result = await awsApiRequest.call(
					mockLoadOptionsFunctions,
					'elasticloadbalancing',
					'GET',
					'/describe-load-balancers',
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
					name: 'Webhook ELB Node',
					type: 'n8n-nodes-base.awsElb',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				const result = await awsApiRequest.call(
					mockWebhookFunctions,
					'elasticloadbalancing',
					'GET',
					'/health-check',
				);

				expect(result).toEqual(mockResponse);
			});

			it('should handle query parameters', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const mockResponse = { success: true };
				const query = { MaxRecords: '20', Marker: 'test-marker' };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				await awsApiRequest.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'GET',
					'/describe-load-balancers',
					undefined,
					query,
				);

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						qs: {
							service: 'elasticloadbalancing',
							path: '/describe-load-balancers',
							MaxRecords: '20',
							Marker: 'test-marker',
						},
					}),
				);
			});

			it('should handle custom headers', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const mockResponse = { success: true };
				const headers = { 'Content-Type': 'application/x-amz-json-1.1' };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					mockResponse,
				);

				await awsApiRequest.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'POST',
					'/create-target-group',
					'body',
					{},
					headers,
				);

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						headers,
					}),
				);
			});
		});

		describe('Error Handling', () => {
			it('should handle credential retrieval errors', async () => {
				const credentialError = new Error('Failed to get AWS credentials');
				mockExecuteFunctions.getCredentials.mockRejectedValue(credentialError);

				await expect(
					awsApiRequest.call(mockExecuteFunctions, 'elasticloadbalancing', 'GET', '/test-path'),
				).rejects.toThrow('Failed to get AWS credentials');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('aws');
			});

			it('should wrap API errors in NodeApiError', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const apiError = new Error('ELB API Error');

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
					apiError,
				);

				await expect(
					awsApiRequest.call(mockExecuteFunctions, 'elasticloadbalancing', 'GET', '/test-path'),
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
					awsApiRequest.call(mockExecuteFunctions, 'elasticloadbalancing', 'GET', '/test-path'),
				).rejects.toThrow(NodeApiError);
			});

			it('should handle network timeout errors', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const timeoutError = new Error('Request timeout');

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
					timeoutError,
				);

				await expect(
					awsApiRequest.call(mockExecuteFunctions, 'elasticloadbalancing', 'GET', '/test-path'),
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

				await awsApiRequest.call(mockExecuteFunctions, 'elasticloadbalancing', 'GET', '/test');

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
					await awsApiRequest.call(mockExecuteFunctions, 'elasticloadbalancing', method, '/test');

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
				const jsonResponse = '{"LoadBalancers": [{"LoadBalancerName": "test-lb"}]}';
				const expectedParsed = { LoadBalancers: [{ LoadBalancerName: 'test-lb' }] };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					jsonResponse,
				);

				const result = await awsApiRequestREST.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'GET',
					'/describe-load-balancers',
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
					'elasticloadbalancing',
					'GET',
					'/describe-load-balancers',
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
					'elasticloadbalancing',
					'DELETE',
					'/delete-load-balancer',
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
					'elasticloadbalancing',
					'DELETE',
					'/delete-target-group',
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
					'elasticloadbalancing',
					'GET',
					'/target-health-count',
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
					'elasticloadbalancing',
					'HEAD',
					'/target-group-exists',
				);

				expect(result).toBe(booleanResponse);
			});

			it('should work with IHookFunctions context', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const jsonResponse = '{"hook": "data"}';

				mockHookFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockHookFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					jsonResponse,
				);
				mockHookFunctions.getNode.mockReturnValue({
					id: 'hook-node',
					name: 'Hook ELB Node',
					type: 'n8n-nodes-base.awsElb',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				const result = await awsApiRequestREST.call(
					mockHookFunctions,
					'elasticloadbalancing',
					'GET',
					'/test',
				);

				expect(result).toEqual({ hook: 'data' });
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
					name: 'Load ELB Node',
					type: 'n8n-nodes-base.awsElb',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				const result = await awsApiRequestREST.call(
					mockLoadOptionsFunctions,
					'elasticloadbalancing',
					'GET',
					'/load-balancer-names',
				);

				expect(result).toEqual(['option1', 'option2', 'option3']);
			});
		});

		describe('Error Propagation', () => {
			it('should propagate errors from awsApiRequest', async () => {
				const apiError = new Error('ELB API request failed');
				mockExecuteFunctions.getCredentials.mockRejectedValue(apiError);

				await expect(
					awsApiRequestREST.call(mockExecuteFunctions, 'elasticloadbalancing', 'GET', '/test'),
				).rejects.toThrow('ELB API request failed');
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
					'elasticloadbalancing',
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
				const xmlResponse =
					'<DescribeLoadBalancersResponse><LoadBalancers><member><LoadBalancerName>test-lb</LoadBalancerName></member></LoadBalancers></DescribeLoadBalancersResponse>';
				const parsedXmlData = {
					DescribeLoadBalancersResponse: {
						LoadBalancers: {
							member: {
								LoadBalancerName: 'test-lb',
							},
						},
					},
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, parsedXmlData);
				});

				const result = await awsApiRequestSOAP.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'POST',
					'/describe-load-balancers',
					'<DescribeLoadBalancersRequest></DescribeLoadBalancersRequest>',
				);

				expect(result).toEqual(parsedXmlData);
				expect(mockParseXml).toHaveBeenCalledWith(
					xmlResponse,
					{ explicitArray: false },
					expect.any(Function),
				);
			});

			it('should return error when XML parsing fails', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const invalidXmlResponse = 'Not valid XML content';
				const parseError = new Error('XML parsing failed');

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					invalidXmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(parseError, null);
				});

				const result = await awsApiRequestSOAP.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'POST',
					'/describe-load-balancers',
				);

				expect(result).toBe(parseError);
				expect(mockParseXml).toHaveBeenCalled();
			});

			it('should handle empty XML response', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const emptyResponse = '';

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					emptyResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, {});
				});

				const result = await awsApiRequestSOAP.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'GET',
					'/status',
				);

				expect(result).toEqual({});
			});

			it('should handle complex nested XML', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const complexXml =
					'<DescribeTargetGroupsResponse><TargetGroups><member><TargetGroupName>tg1</TargetGroupName></member><member><TargetGroupName>tg2</TargetGroupName></member></TargetGroups></DescribeTargetGroupsResponse>';
				const parsedData = {
					DescribeTargetGroupsResponse: {
						TargetGroups: {
							member: [{ TargetGroupName: 'tg1' }, { TargetGroupName: 'tg2' }],
						},
					},
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					complexXml,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, parsedData);
				});

				const result = await awsApiRequestSOAP.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'GET',
					'/describe-target-groups',
				);

				expect(result).toEqual(parsedData);
				expect(mockParseXml).toHaveBeenCalledWith(
					complexXml,
					{ explicitArray: false },
					expect.any(Function),
				);
			});

			it('should work with IHookFunctions context', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = '<hook><status>received</status></hook>';
				const parsedData = { hook: { status: 'received' } };

				mockHookFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockHookFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);
				mockHookFunctions.getNode.mockReturnValue({
					id: 'hook-node',
					name: 'Hook ELB Node',
					type: 'n8n-nodes-base.awsElb',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, parsedData);
				});

				const result = await awsApiRequestSOAP.call(
					mockHookFunctions,
					'elasticloadbalancing',
					'POST',
					'/hook',
				);

				expect(result).toEqual(parsedData);
			});

			it('should work with ILoadOptionsFunctions context', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = '<options><item>opt1</item><item>opt2</item></options>';
				const parsedData = { options: { item: ['opt1', 'opt2'] } };

				mockLoadOptionsFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);
				mockLoadOptionsFunctions.getNode.mockReturnValue({
					id: 'load-node',
					name: 'Load ELB Node',
					type: 'n8n-nodes-base.awsElb',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, parsedData);
				});

				const result = await awsApiRequestSOAP.call(
					mockLoadOptionsFunctions,
					'elasticloadbalancing',
					'GET',
					'/options',
				);

				expect(result).toEqual(parsedData);
			});

			it('should work with IWebhookFunctions context', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = '<webhook><processed>true</processed></webhook>';
				const parsedData = { webhook: { processed: 'true' } };

				mockWebhookFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockWebhookFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);
				mockWebhookFunctions.getNode.mockReturnValue({
					id: 'webhook-node',
					name: 'Webhook ELB Node',
					type: 'n8n-nodes-base.awsElb',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, parsedData);
				});

				const result = await awsApiRequestSOAP.call(
					mockWebhookFunctions,
					'elasticloadbalancing',
					'POST',
					'/webhook',
				);

				expect(result).toEqual(parsedData);
			});
		});

		describe('Error Propagation', () => {
			it('should propagate errors from awsApiRequest', async () => {
				const apiError = new Error('SOAP ELB API request failed');
				mockExecuteFunctions.getCredentials.mockRejectedValue(apiError);

				await expect(
					awsApiRequestSOAP.call(mockExecuteFunctions, 'elasticloadbalancing', 'POST', '/test'),
				).rejects.toThrow('SOAP ELB API request failed');
			});

			it('should handle XML parser errors gracefully', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = '<malformed>xml</broken>';
				const parseError = new Error('Invalid XML structure');

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(parseError, null);
				});

				const result = await awsApiRequestSOAP.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'POST',
					'/test',
				);

				expect(result).toBe(parseError);
			});
		});

		describe('XML Parser Configuration', () => {
			it('should call XML parser with explicitArray: false', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = '<test>data</test>';

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, { test: 'data' });
				});

				await awsApiRequestSOAP.call(mockExecuteFunctions, 'elasticloadbalancing', 'GET', '/test');

				expect(mockParseXml).toHaveBeenCalledWith(
					xmlResponse,
					{ explicitArray: false },
					expect.any(Function),
				);
			});
		});

		describe('Edge Cases', () => {
			it('should handle null response from API', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const nullResponse = null;

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					nullResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, {});
				});

				const result = await awsApiRequestSOAP.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'GET',
					'/test',
				);

				expect(result).toEqual({});
			});

			it('should handle undefined response from API', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const undefinedResponse = undefined;

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					undefinedResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, {});
				});

				const result = await awsApiRequestSOAP.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'GET',
					'/test',
				);

				expect(result).toEqual({});
			});
		});
	});

	describe('awsApiRequestSOAPAllItems', () => {
		describe('Pagination Handling', () => {
			it('should handle single page response without NextMarker', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					DescribeLoadBalancersResponse: {
						DescribeLoadBalancersResult: {
							LoadBalancerDescriptions: [{ LoadBalancerName: 'lb1' }, { LoadBalancerName: 'lb2' }],
						},
					},
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockImplementation((_obj: any, path: any) => {
					const pathStr = Array.isArray(path) ? path.join('.') : String(path);
					if (
						pathStr ===
						'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions'
					) {
						return xmlResponse.DescribeLoadBalancersResponse.DescribeLoadBalancersResult
							.LoadBalancerDescriptions;
					}
					if (pathStr.includes('NextMarker')) {
						return undefined;
					}
					return undefined;
				});

				const result = await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions',
					'elasticloadbalancing',
					'POST',
					'/describe-load-balancers',
				);

				expect(result).toEqual([{ LoadBalancerName: 'lb1' }, { LoadBalancerName: 'lb2' }]);
			});

			it('should call awsApiRequestSOAP function for pagination', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					DescribeLoadBalancersResponse: {
						DescribeLoadBalancersResult: {
							LoadBalancerDescriptions: [{ LoadBalancerName: 'test-lb' }],
						},
					},
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockImplementation((_obj: any, path: any) => {
					const pathStr = Array.isArray(path) ? path.join('.') : String(path);
					if (
						pathStr ===
						'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions'
					) {
						return xmlResponse.DescribeLoadBalancersResponse.DescribeLoadBalancersResult
							.LoadBalancerDescriptions;
					}
					if (pathStr === 'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.NextMarker') {
						return undefined;
					}
					return undefined;
				});

				const result = await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions',
					'elasticloadbalancing',
					'POST',
					'/describe-load-balancers',
				);

				expect(result).toEqual([{ LoadBalancerName: 'test-lb' }]);
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						method: 'POST',
						qs: expect.objectContaining({
							service: 'elasticloadbalancing',
							path: '/describe-load-balancers',
						}),
					}),
				);
			});

			it('should handle array items correctly', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					DescribeTargetGroupsResponse: {
						DescribeTargetGroupsResult: {
							TargetGroups: [
								{ TargetGroupName: 'tg1' },
								{ TargetGroupName: 'tg2' },
								{ TargetGroupName: 'tg3' },
							],
						},
					},
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockImplementation((_obj: any, path: any) => {
					const pathStr = Array.isArray(path) ? path.join('.') : String(path);
					if (pathStr === 'DescribeTargetGroupsResponse.DescribeTargetGroupsResult.TargetGroups') {
						return xmlResponse.DescribeTargetGroupsResponse.DescribeTargetGroupsResult.TargetGroups;
					}
					if (pathStr.includes('NextMarker')) {
						return undefined;
					}
					return undefined;
				});

				const result = await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'DescribeTargetGroupsResponse.DescribeTargetGroupsResult.TargetGroups',
					'elasticloadbalancing',
					'POST',
					'/describe-target-groups',
				);

				expect(result).toEqual([
					{ TargetGroupName: 'tg1' },
					{ TargetGroupName: 'tg2' },
					{ TargetGroupName: 'tg3' },
				]);
			});

			it('should handle single item correctly', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					DescribeLoadBalancersResponse: {
						DescribeLoadBalancersResult: {
							LoadBalancerDescriptions: { LoadBalancerName: 'single-lb' },
						},
					},
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockImplementation((_obj: any, path: any) => {
					const pathStr = Array.isArray(path) ? path.join('.') : String(path);
					if (
						pathStr ===
						'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions'
					) {
						return xmlResponse.DescribeLoadBalancersResponse.DescribeLoadBalancersResult
							.LoadBalancerDescriptions;
					}
					if (pathStr.includes('NextMarker')) {
						return undefined;
					}
					return undefined;
				});

				const result = await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions',
					'elasticloadbalancing',
					'POST',
					'/describe-load-balancers',
				);

				expect(result).toEqual([{ LoadBalancerName: 'single-lb' }]);
			});

			it('should handle pagination termination when NextMarker is undefined', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					DescribeLoadBalancersResponse: {
						DescribeLoadBalancersResult: {
							LoadBalancerDescriptions: [{ LoadBalancerName: 'final-lb' }],
						},
					},
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockImplementation((_obj: any, path: any) => {
					const pathStr = Array.isArray(path) ? path.join('.') : String(path);
					if (
						pathStr ===
						'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions'
					) {
						return xmlResponse.DescribeLoadBalancersResponse.DescribeLoadBalancersResult
							.LoadBalancerDescriptions;
					}
					if (pathStr === 'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.NextMarker') {
						return undefined;
					}
					return undefined;
				});

				const result = await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions',
					'elasticloadbalancing',
					'POST',
					'/describe-load-balancers',
				);

				expect(result).toEqual([{ LoadBalancerName: 'final-lb' }]);
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
			});

			it('should work with IHookFunctions context', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					HookResponse: {
						HookResult: {
							Items: [{ id: '1' }, { id: '2' }],
						},
					},
				};

				mockHookFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockHookFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);
				mockHookFunctions.getNode.mockReturnValue({
					id: 'hook-node',
					name: 'Hook ELB Node',
					type: 'n8n-nodes-base.awsElb',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockImplementation((_obj: any, path: any) => {
					const pathStr = Array.isArray(path) ? path.join('.') : String(path);
					if (pathStr === 'HookResponse.HookResult.Items') {
						return xmlResponse.HookResponse.HookResult.Items;
					}
					if (pathStr.includes('NextMarker')) {
						return undefined;
					}
					return undefined;
				});

				const result = await awsApiRequestSOAPAllItems.call(
					mockHookFunctions,
					'HookResponse.HookResult.Items',
					'elasticloadbalancing',
					'POST',
					'/hook-list',
				);

				expect(result).toEqual([{ id: '1' }, { id: '2' }]);
			});

			it('should work with ILoadOptionsFunctions context', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					LoadOptionsResponse: {
						LoadOptionsResult: {
							Options: [{ name: 'opt1' }, { name: 'opt2' }],
						},
					},
				};

				mockLoadOptionsFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);
				mockLoadOptionsFunctions.getNode.mockReturnValue({
					id: 'load-node',
					name: 'Load ELB Node',
					type: 'n8n-nodes-base.awsElb',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockImplementation((_obj: any, path: any) => {
					const pathStr = Array.isArray(path) ? path.join('.') : String(path);
					if (pathStr === 'LoadOptionsResponse.LoadOptionsResult.Options') {
						return xmlResponse.LoadOptionsResponse.LoadOptionsResult.Options;
					}
					if (pathStr.includes('NextMarker')) {
						return undefined;
					}
					return undefined;
				});

				const result = await awsApiRequestSOAPAllItems.call(
					mockLoadOptionsFunctions,
					'LoadOptionsResponse.LoadOptionsResult.Options',
					'elasticloadbalancing',
					'GET',
					'/load-options',
				);

				expect(result).toEqual([{ name: 'opt1' }, { name: 'opt2' }]);
			});

			it('should work with IWebhookFunctions context', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					WebhookResponse: {
						WebhookResult: {
							Events: [{ event: 'create' }, { event: 'delete' }],
						},
					},
				};

				mockWebhookFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockWebhookFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);
				mockWebhookFunctions.getNode.mockReturnValue({
					id: 'webhook-node',
					name: 'Webhook ELB Node',
					type: 'n8n-nodes-base.awsElb',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				});

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockImplementation((_obj: any, path: any) => {
					const pathStr = Array.isArray(path) ? path.join('.') : String(path);
					if (pathStr === 'WebhookResponse.WebhookResult.Events') {
						return xmlResponse.WebhookResponse.WebhookResult.Events;
					}
					if (pathStr.includes('NextMarker')) {
						return undefined;
					}
					return undefined;
				});

				const result = await awsApiRequestSOAPAllItems.call(
					mockWebhookFunctions,
					'WebhookResponse.WebhookResult.Events',
					'elasticloadbalancing',
					'POST',
					'/webhook-events',
				);

				expect(result).toEqual([{ event: 'create' }, { event: 'delete' }]);
			});
		});

		describe('Query Parameter Handling', () => {
			it('should pass through initial query parameters', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					DescribeLoadBalancersResponse: {
						DescribeLoadBalancersResult: {
							LoadBalancerDescriptions: [{ LoadBalancerName: 'lb1' }],
						},
					},
				};
				const initialQuery = { PageSize: '10', LoadBalancerNames: 'test-lb' };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockImplementation((_obj: any, path: any) => {
					const pathStr = Array.isArray(path) ? path.join('.') : String(path);
					if (
						pathStr ===
						'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions'
					) {
						return xmlResponse.DescribeLoadBalancersResponse.DescribeLoadBalancersResult
							.LoadBalancerDescriptions;
					}
					if (pathStr.includes('NextMarker')) {
						return undefined;
					}
					return undefined;
				});

				await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions',
					'elasticloadbalancing',
					'POST',
					'/describe-load-balancers',
					undefined,
					initialQuery,
				);

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						qs: expect.objectContaining({
							...initialQuery,
							service: 'elasticloadbalancing',
							path: '/describe-load-balancers',
						}),
					}),
				);
			});

			it('should handle custom headers correctly', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					DescribeLoadBalancersResponse: {
						DescribeLoadBalancersResult: {
							LoadBalancerDescriptions: [{ LoadBalancerName: 'lb1' }],
						},
					},
				};
				const headers = { 'Content-Type': 'application/x-amz-json-1.1' };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockReturnValueOnce([{ LoadBalancerName: 'lb1' }]).mockReturnValueOnce(undefined);

				await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions',
					'elasticloadbalancing',
					'POST',
					'/describe-load-balancers',
					undefined,
					{},
					headers,
				);

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						headers,
					}),
				);
			});

			it('should handle options parameter correctly', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					DescribeLoadBalancersResponse: {
						DescribeLoadBalancersResult: {
							LoadBalancerDescriptions: [{ LoadBalancerName: 'lb1' }],
						},
					},
				};
				const options = { timeout: 30000 };

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockReturnValueOnce([{ LoadBalancerName: 'lb1' }]).mockReturnValueOnce(undefined);

				await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions',
					'elasticloadbalancing',
					'POST',
					'/describe-load-balancers',
					undefined,
					{},
					{},
					options,
				);

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						qs: expect.objectContaining({
							service: 'elasticloadbalancing',
							path: '/describe-load-balancers',
						}),
					}),
				);
			});

			it('should handle region parameter correctly', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					DescribeLoadBalancersResponse: {
						DescribeLoadBalancersResult: {
							LoadBalancerDescriptions: [{ LoadBalancerName: 'lb1' }],
						},
					},
				};
				const customRegion = 'eu-west-1';

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockReturnValueOnce([{ LoadBalancerName: 'lb1' }]).mockReturnValueOnce(undefined);

				await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions',
					'elasticloadbalancing',
					'POST',
					'/describe-load-balancers',
					undefined,
					{},
					{},
					{},
					customRegion,
				);

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'aws',
					expect.objectContaining({
						region: 'us-east-1',
					}),
				);
			});
		});

		describe('Error Handling', () => {
			it('should propagate errors from awsApiRequestSOAP', async () => {
				const apiError = new Error('ELB SOAP pagination API request failed');
				mockExecuteFunctions.getCredentials.mockRejectedValue(apiError);

				await expect(
					awsApiRequestSOAPAllItems.call(
						mockExecuteFunctions,
						'Response.Result.Items',
						'elasticloadbalancing',
						'POST',
						'/test',
					),
				).rejects.toThrow('ELB SOAP pagination API request failed');
			});

			it('should handle empty property path gracefully', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					EmptyResponse: {
						EmptyResult: {},
					},
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockReturnValueOnce(undefined).mockReturnValueOnce(undefined);

				const result = await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'EmptyResponse.EmptyResult.NonexistentProperty',
					'elasticloadbalancing',
					'POST',
					'/test',
				);

				expect(result).toEqual([]);
			});
		});

		describe('Edge Cases', () => {
			it('should handle empty response data', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockReturnValueOnce(undefined).mockReturnValueOnce(undefined);

				const result = await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'Response.Result.Items',
					'elasticloadbalancing',
					'POST',
					'/test',
				);

				expect(result).toEqual([]);
			});

			it('should handle null property values', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					Response: {
						Result: {
							Items: null,
						},
					},
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
					xmlResponse,
				);

				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				mockGet.mockReturnValueOnce(null).mockReturnValueOnce(undefined);

				const result = await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'Response.Result.Items',
					'elasticloadbalancing',
					'POST',
					'/test',
				);

				expect(result).toEqual([]);
			});
		});
	});
});
