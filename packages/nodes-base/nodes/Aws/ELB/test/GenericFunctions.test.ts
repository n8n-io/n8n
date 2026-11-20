import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError, requestPath } from 'n8n-workflow';

import {
	awsApiRequest,
	awsApiRequestREST,
	awsApiRequestSOAP,
	awsApiRequestSOAPAllItems,
} from '../GenericFunctions';

vi.mock('xml2js', () => ({
	parseString: vi.fn(),
}));

import { parseString as parseXml } from 'xml2js';
import type { Mock, Mocked, MockedFunction } from 'vitest';

describe('ELB GenericFunctions', () => {
	describe('awsApiRequest', () => {
		let mockExecuteFunctions: Mocked<IExecuteFunctions>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			vi.clearAllMocks();

			mockExecuteFunctions.getNode.mockReturnValue({
				id: 'test-node',
				name: 'Test ELB Node',
				type: 'n8n-nodes-base.awsElb',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});
		});

		it('should make successful API request with basic parameters', async () => {
			const mockResponse = { success: true };
			const mockRequestWithAuth = mockExecuteFunctions.helpers.requestWithAuthentication as Mock;
			mockRequestWithAuth.mockResolvedValue(mockResponse);

			const result = await awsApiRequest.call(
				mockExecuteFunctions,
				'elasticloadbalancing',
				'GET',
				requestPath`/test-path`,
			);

			expect(result).toEqual(mockResponse);
			expect(mockRequestWithAuth).toHaveBeenCalledWith(
				'aws',
				expect.objectContaining({
					qs: expect.objectContaining({
						service: 'elasticloadbalancing',
						path: '/test-path',
					}),
					method: 'GET',
				}),
			);
		});

		it('should handle API errors', async () => {
			const apiError = new Error('API Error');
			const mockRequestWithAuth = mockExecuteFunctions.helpers.requestWithAuthentication as Mock;
			mockRequestWithAuth.mockRejectedValue(apiError);

			await expect(
				awsApiRequest.call(
					mockExecuteFunctions,
					'elasticloadbalancing',
					'GET',
					requestPath`/test-path`,
				),
			).rejects.toThrow(NodeApiError);
		});

		it('should encode query values', async () => {
			const mockRequestWithAuth = mockExecuteFunctions.helpers.requestWithAuthentication as Mock;
			mockRequestWithAuth.mockResolvedValue({});

			await awsApiRequest.call(
				mockExecuteFunctions,
				'elasticloadbalancing',
				'GET',
				requestPath`/`,
				undefined,
				{ Action: 'DeleteLoadBalancer', LoadBalancerArn: 'app/lb?x=1&Version=1#a' },
			);

			expect(mockRequestWithAuth).toHaveBeenCalledWith(
				'aws',
				expect.objectContaining({
					qs: {
						service: 'elasticloadbalancing',
						path: '/?Action=DeleteLoadBalancer&LoadBalancerArn=app%2Flb%3Fx%3D1%26Version%3D1%23a',
					},
				}),
			);
		});
	});

	describe('awsApiRequestREST', () => {
		let mockExecuteFunctions: Mocked<IExecuteFunctions>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			vi.clearAllMocks();
		});

		it('should parse valid JSON response', async () => {
			const jsonResponse = '{"result": "success", "data": [1,2,3]}';
			const expectedResult = { result: 'success', data: [1, 2, 3] };
			const mockRequestWithAuth = mockExecuteFunctions.helpers.requestWithAuthentication as Mock;
			mockRequestWithAuth.mockResolvedValue(jsonResponse);

			const result = await awsApiRequestREST.call(
				mockExecuteFunctions,
				'elasticloadbalancing',
				'GET',
				requestPath`/test-path`,
			);

			expect(result).toEqual(expectedResult);
		});

		it('should return raw response when JSON parsing fails', async () => {
			const rawResponse = 'not json data';
			const mockRequestWithAuth = mockExecuteFunctions.helpers.requestWithAuthentication as Mock;
			mockRequestWithAuth.mockResolvedValue(rawResponse);

			const result = await awsApiRequestREST.call(
				mockExecuteFunctions,
				'elasticloadbalancing',
				'GET',
				requestPath`/test-path`,
			);

			expect(result).toBe(rawResponse);
		});
	});

	describe('awsApiRequestSOAP', () => {
		let mockExecuteFunctions: Mocked<IExecuteFunctions>;
		const mockParseXml = parseXml as MockedFunction<typeof parseXml>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			vi.clearAllMocks();
		});

		it('should parse XML response correctly', async () => {
			const xmlResponse =
				'<ListBucketsResult><Buckets><Bucket><Name>test-bucket</Name></Bucket></Buckets></ListBucketsResult>';
			const expectedParsedData = {
				ListBucketsResult: {
					Buckets: {
						Bucket: {
							Name: 'test-bucket',
						},
					},
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValue(
				xmlResponse,
			);
			mockParseXml.mockImplementation((_xml, _options, callback) => {
				callback(null, expectedParsedData);
			});

			const result = await awsApiRequestSOAP.call(
				mockExecuteFunctions,
				'elasticloadbalancing',
				'GET',
				requestPath`/test-path`,
			);

			expect(result).toEqual(expectedParsedData);
		});

		it('should handle XML parsing errors', async () => {
			const xmlResponse = 'invalid xml';
			const xmlError = new Error('Invalid XML');

			(mockExecuteFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValue(
				xmlResponse,
			);
			mockParseXml.mockImplementation((_xml, _options, callback) => {
				callback(xmlError, null);
			});

			const result = await awsApiRequestSOAP.call(
				mockExecuteFunctions,
				'elasticloadbalancing',
				'GET',
				requestPath`/test-path`,
			);

			expect(result).toBeInstanceOf(Error);
		});
	});

	describe('awsApiRequestSOAPAllItems', () => {
		let mockExecuteFunctions: Mocked<IExecuteFunctions>;
		const mockParseXml = parseXml as MockedFunction<typeof parseXml>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			vi.clearAllMocks();
		});

		describe('pagination patterns', () => {
			it('should handle DescribeLoadBalancers pagination', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const xmlResponse = {
					DescribeLoadBalancersResponse: {
						DescribeLoadBalancersResult: {
							LoadBalancerDescriptions: [
								{ LoadBalancerName: 'elb-1' },
								{ LoadBalancerName: 'elb-2' },
							],
						},
					},
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValue(
					'<xml>response</xml>',
				);
				mockParseXml.mockImplementation((_xml, _options, callback) => {
					callback(null, xmlResponse);
				});

				const result = await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions',
					'elasticloadbalancing',
					'POST',
					requestPath`/describe-load-balancers`,
				);

				expect(result).toEqual([{ LoadBalancerName: 'elb-1' }, { LoadBalancerName: 'elb-2' }]);
			});

			it('should handle DescribeTargetGroups with nested properties', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const firstResponse = {
					DescribeTargetGroupsResponse: {
						DescribeTargetGroupsResult: {
							TargetGroups: [
								{ TargetGroupName: 'tg-1', Protocol: 'HTTP' },
								{ TargetGroupName: 'tg-2', Protocol: 'HTTPS' },
							],
							NextMarker: 'marker123',
						},
					},
				};
				const secondResponse = {
					DescribeTargetGroupsResponse: {
						DescribeTargetGroupsResult: {
							TargetGroups: [{ TargetGroupName: 'tg-3', Protocol: 'TCP' }],
						},
					},
				};

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as Mock)
					.mockResolvedValueOnce('<xml>first-response</xml>')
					.mockResolvedValueOnce('<xml>second-response</xml>');

				mockParseXml
					.mockImplementationOnce((_xml, _options, callback) => callback(null, firstResponse))
					.mockImplementationOnce((_xml, _options, callback) => callback(null, secondResponse));

				const result = await awsApiRequestSOAPAllItems.call(
					mockExecuteFunctions,
					'DescribeTargetGroupsResponse.DescribeTargetGroupsResult.TargetGroups',
					'elasticloadbalancing',
					'POST',
					requestPath`/describe-target-groups`,
				);

				expect(result).toEqual([
					{ TargetGroupName: 'tg-1', Protocol: 'HTTP' },
					{ TargetGroupName: 'tg-2', Protocol: 'HTTPS' },
					{ TargetGroupName: 'tg-3', Protocol: 'TCP' },
				]);

				const requestMock = mockExecuteFunctions.helpers.requestWithAuthentication as Mock;
				expect(requestMock.mock.calls[0][1].qs.path).toBe('/describe-target-groups');
				expect(requestMock.mock.calls[1][1].qs.path).toBe(
					'/describe-target-groups?Marker=marker123',
				);
			});
		});

		describe('error handling', () => {
			it('should handle service error responses', async () => {
				const mockCredentials = { region: 'us-east-1' };
				const elbError = new Error(
					'LoadBalancerNotFound: The specified load balancer does not exist',
				);

				mockExecuteFunctions.getCredentials.mockResolvedValue(mockCredentials);
				(mockExecuteFunctions.helpers.requestWithAuthentication as Mock).mockRejectedValue(
					elbError,
				);

				await expect(
					awsApiRequestSOAPAllItems.call(
						mockExecuteFunctions,
						'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancerDescriptions',
						'elasticloadbalancing',
						'POST',
						requestPath`/describe-load-balancers`,
					),
				).rejects.toThrow('LoadBalancerNotFound: The specified load balancer does not exist');
			});
		});
	});
});
