import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, IHookFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../V2/GenericFunctions';

jest.mock('xml2js', () => ({
	parseString: jest.fn(),
}));

import { parseString as parseXml } from 'xml2js';

describe('AWS S3 V2 GenericFunctions', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockHookFunctions: jest.Mocked<IHookFunctions>;
	// let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;
	const mockParseXml = parseXml as jest.MockedFunction<typeof parseXml>;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockHookFunctions = mockDeep<IHookFunctions>();
		// mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		jest.clearAllMocks();
	});

	describe('awsApiRequest', () => {
		it('should make AWS API request with basic parameters', async () => {
			const mockResponse = { success: true };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			const result = await GenericFunctions.awsApiRequest.call(
				mockExecuteFunctions,
				's3',
				'GET',
				'/bucket',
				'',
				{},
				{},
				{},
				'us-east-1',
			);

			expect(result).toEqual(mockResponse);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'aws',
				expect.objectContaining({
					qs: expect.objectContaining({
						service: 's3',
						path: '/bucket',
					}),
					method: 'GET',
					body: '',
					url: '',
				}),
			);
		});

		it('should handle query parameters correctly', async () => {
			const mockResponse = { data: 'test' };
			const queryParams = { 'list-type': '2', 'max-keys': '10' };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			await GenericFunctions.awsApiRequest.call(
				mockExecuteFunctions,
				's3',
				'GET',
				'/bucket',
				'',
				queryParams,
				{},
				{},
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'aws',
				expect.objectContaining({
					qs: expect.objectContaining({
						...queryParams,
						service: 's3',
						path: '/bucket',
						query: queryParams,
					}),
				}),
			);
		});

		it('should handle headers correctly', async () => {
			const mockResponse = { success: true };
			const headers = { 'Content-Type': 'application/xml' };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			await GenericFunctions.awsApiRequest.call(
				mockExecuteFunctions,
				's3',
				'PUT',
				'/bucket/file.txt',
				'<xml>data</xml>',
				{},
				headers,
				{},
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'aws',
				expect.objectContaining({
					method: 'PUT',
					body: '<xml>data</xml>',
					headers,
				}),
			);
		});

		it('should apply additional options when provided', async () => {
			const mockResponse = { success: true };
			const options = { timeout: 30000 };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			await GenericFunctions.awsApiRequest.call(
				mockExecuteFunctions,
				's3',
				'GET',
				'/bucket',
				'',
				{},
				{},
				options,
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'aws',
				expect.objectContaining({
					timeout: 30000,
				}),
			);
		});

		it('should handle Buffer body data', async () => {
			const mockResponse = { success: true };
			const bufferData = Buffer.from('test data');
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			await GenericFunctions.awsApiRequest.call(
				mockExecuteFunctions,
				's3',
				'PUT',
				'/bucket/file.txt',
				bufferData,
				{},
				{},
				{},
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'aws',
				expect.objectContaining({
					body: bufferData,
				}),
			);
		});

		it('should work with different function contexts', async () => {
			const mockResponse = { success: true };
			(mockHookFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			const result = await GenericFunctions.awsApiRequest.call(
				mockHookFunctions,
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual(mockResponse);
		});

		it('should handle empty options object', async () => {
			const mockResponse = { success: true };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				mockResponse,
			);

			await GenericFunctions.awsApiRequest.call(
				mockExecuteFunctions,
				's3',
				'GET',
				'/bucket',
				'',
				{},
				{},
				{},
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'aws',
				expect.objectContaining({
					qs: expect.objectContaining({
						service: 's3',
						path: '/bucket',
					}),
				}),
			);
		});
	});

	describe('awsApiRequestREST', () => {
		it('should parse JSON response correctly', async () => {
			const jsonResponse = '{"result": "success", "data": [1,2,3]}';
			const expectedResult = { result: 'success', data: [1, 2, 3] };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				jsonResponse,
			);

			const result = await GenericFunctions.awsApiRequestREST.call(
				mockExecuteFunctions,
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual(expectedResult);
		});

		it('should return raw response when JSON parsing fails', async () => {
			const rawResponse = 'not json data';
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				rawResponse,
			);

			const result = await GenericFunctions.awsApiRequestREST.call(
				mockExecuteFunctions,
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toBe(rawResponse);
		});

		it('should parse XML response correctly', async () => {
			const xmlResponse = '<?xml version="1.0" encoding="UTF-8"?><root><item>test</item></root>';
			const expectedResult = { root: { item: 'test' } };
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				xmlResponse,
			);

			mockParseXml.mockImplementation((_, __, callback) => {
				callback(null, expectedResult);
			});

			const result = await GenericFunctions.awsApiRequestREST.call(
				mockExecuteFunctions,
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual(expectedResult);
			expect(mockParseXml).toHaveBeenCalledWith(
				xmlResponse,
				{ explicitArray: false },
				expect.any(Function),
			);
		});

		it('should handle XML parsing errors', async () => {
			const xmlResponse = '<?xml version="1.0" encoding="UTF-8"?><root><item>test</item></root>';
			const parseError = new Error('XML parsing failed');
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				xmlResponse,
			);

			mockParseXml.mockImplementation((_, __, callback) => {
				callback(parseError, null);
			});

			const result = await GenericFunctions.awsApiRequestREST.call(
				mockExecuteFunctions,
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toBe(xmlResponse);
		});

		it('should handle empty response', async () => {
			const emptyResponse = '';
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				emptyResponse,
			);

			const result = await GenericFunctions.awsApiRequestREST.call(
				mockExecuteFunctions,
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toBe(emptyResponse);
		});

		it('should handle null response', async () => {
			const nullResponse = null;
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				nullResponse,
			);

			const result = await GenericFunctions.awsApiRequestREST.call(
				mockExecuteFunctions,
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toBeNull();
		});

		it('should pass all parameters to awsApiRequest', async () => {
			const jsonResponse = '{"success": true}';
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				jsonResponse,
			);

			await GenericFunctions.awsApiRequestREST.call(
				mockExecuteFunctions,
				's3',
				'POST',
				'/bucket/upload',
				'data',
				{ param: 'value' },
				{ header: 'value' },
				{ option: 'value' },
				'us-west-2',
			);

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'aws',
				expect.objectContaining({
					qs: expect.objectContaining({
						service: 's3',
						path: '/bucket/upload',
						param: 'value',
						query: { param: 'value' },
					}),
					method: 'POST',
					body: 'data',
					headers: { header: 'value' },
					option: 'value',
				}),
			);
		});
	});

	describe('awsApiRequestRESTAllItems', () => {
		it('should return all items without pagination', async () => {
			const mockResponse = {
				ListBucketResult: {
					IsTruncated: false,
					Contents: [
						{ Key: 'file1.txt', Size: 1024 },
						{ Key: 'file2.txt', Size: 2048 },
					],
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				JSON.stringify(mockResponse),
			);

			const result = await GenericFunctions.awsApiRequestRESTAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual([
				{ Key: 'file1.txt', Size: 1024 },
				{ Key: 'file2.txt', Size: 2048 },
			]);
		});

		it('should handle paginated responses', async () => {
			const mockFirstPage = {
				ListBucketResult: {
					IsTruncated: 'true',
					NextContinuationToken: 'token123',
					Contents: [{ Key: 'file1.txt', Size: 1024 }],
				},
			};

			const mockSecondPage = {
				ListBucketResult: {
					IsTruncated: false,
					Contents: [{ Key: 'file2.txt', Size: 2048 }],
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock)
				.mockResolvedValueOnce(JSON.stringify(mockFirstPage))
				.mockResolvedValueOnce(JSON.stringify(mockSecondPage));

			const result = await GenericFunctions.awsApiRequestRESTAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual([
				{ Key: 'file1.txt', Size: 1024 },
				{ Key: 'file2.txt', Size: 2048 },
			]);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
		});

		it('should handle empty results', async () => {
			const mockResponse = {
				ListBucketResult: {
					IsTruncated: false,
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				JSON.stringify(mockResponse),
			);

			const result = await GenericFunctions.awsApiRequestRESTAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual([]);
		});

		it('should handle single item response', async () => {
			const mockResponse = {
				ListBucketResult: {
					IsTruncated: false,
					Contents: { Key: 'single-file.txt', Size: 1024 },
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				JSON.stringify(mockResponse),
			);

			const result = await GenericFunctions.awsApiRequestRESTAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual([{ Key: 'single-file.txt', Size: 1024 }]);
		});

		it('should handle limit parameter', async () => {
			const mockResponse = {
				ListBucketResult: {
					IsTruncated: 'true',
					NextContinuationToken: 'token123',
					Contents: [
						{ Key: 'file1.txt', Size: 1024 },
						{ Key: 'file2.txt', Size: 2048 },
					],
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				JSON.stringify(mockResponse),
			);

			const result = await GenericFunctions.awsApiRequestRESTAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
				undefined,
				{ limit: 2 },
			);

			expect(result).toHaveLength(2);
		});
	});
});
