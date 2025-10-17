import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

// Mock xml2js before importing the module
const mockParseString = jest.fn();
jest.mock('xml2js', () => ({
	parseString: mockParseString,
}));

import {
	awsApiRequest,
	awsApiRequestREST,
	awsApiRequestSOAP,
	awsApiRequestSOAPAllItems,
} from '../../V1/GenericFunctions';

describe('AWS S3 V1 GenericFunctions', () => {
	describe('awsApiRequest', () => {
		let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			jest.clearAllMocks();
		});

		it('should make AWS API request with basic parameters', async () => {
			const mockResponse = { success: true };
			(mockExecuteFunctions.helpers.requestWithAuthentication as any).mockResolvedValue(
				mockResponse,
			);

			const result = await awsApiRequest.call(
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
			(mockExecuteFunctions.helpers.requestWithAuthentication as any).mockResolvedValue(
				mockResponse,
			);

			await awsApiRequest.call(
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
	});

	describe('awsApiRequestREST', () => {
		let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			jest.clearAllMocks();
		});

		it('should parse JSON response correctly', async () => {
			const jsonResponse = { id: '123', name: 'test' };
			(mockExecuteFunctions.helpers.requestWithAuthentication as any).mockResolvedValue(
				JSON.stringify(jsonResponse),
			);

			const result = await awsApiRequestREST.call(mockExecuteFunctions, 's3', 'GET', '/bucket');

			expect(result).toEqual(jsonResponse);
		});

		it('should return raw response when JSON parsing fails', async () => {
			const rawResponse = 'not valid json';
			(mockExecuteFunctions.helpers.requestWithAuthentication as any).mockResolvedValue(
				rawResponse,
			);

			const result = await awsApiRequestREST.call(mockExecuteFunctions, 's3', 'GET', '/bucket');

			expect(result).toBe(rawResponse);
		});
	});

	describe('awsApiRequestSOAP', () => {
		let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			jest.clearAllMocks();
		});

		it('should parse XML response correctly', async () => {
			const xmlResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>test-bucket</Name></ListBucketResult>';

			const expectedParsedData = {
				ListBucketResult: {
					Name: 'test-bucket',
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as any).mockResolvedValue(
				xmlResponse,
			);
			mockParseString.mockImplementation((_, __, callback) => {
				callback(null, expectedParsedData);
			});

			const result = await awsApiRequestSOAP.call(mockExecuteFunctions, 's3', 'GET', '/bucket');

			expect(result).toEqual(expectedParsedData);
		});

		it('should return error object when XML parsing fails', async () => {
			const invalidXml = 'not valid xml';
			const xmlError = new Error('Invalid XML');

			(mockExecuteFunctions.helpers.requestWithAuthentication as any).mockResolvedValue(invalidXml);
			mockParseString.mockImplementation((_, __, callback) => {
				callback(xmlError);
			});

			const result = await awsApiRequestSOAP.call(mockExecuteFunctions, 's3', 'GET', '/bucket');

			expect(result).toBeInstanceOf(Error);
		});
	});

	describe('awsApiRequestSOAPAllItems', () => {
		let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			jest.clearAllMocks();
		});

		it('should collect all items from single page response', async () => {
			const xmlResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Contents><Key>file1.txt</Key><Size>1024</Size></Contents><Contents><Key>file2.txt</Key><Size>2048</Size></Contents><IsTruncated>false</IsTruncated></ListBucketResult>';

			const expectedParsedData = {
				ListBucketResult: {
					Contents: [
						{ Key: 'file1.txt', Size: '1024' },
						{ Key: 'file2.txt', Size: '2048' },
					],
					IsTruncated: 'false',
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as any).mockResolvedValue(
				xmlResponse,
			);
			mockParseString.mockImplementation((_, __, callback) => {
				callback(null, expectedParsedData);
			});

			const result = await awsApiRequestSOAPAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual([
				{ Key: 'file1.txt', Size: '1024' },
				{ Key: 'file2.txt', Size: '2048' },
			]);
		});

		it('should handle empty response', async () => {
			const xmlResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>';

			const expectedParsedData = {
				ListBucketResult: {
					IsTruncated: 'false',
				},
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as any).mockResolvedValue(
				xmlResponse,
			);
			mockParseString.mockImplementation((_, __, callback) => {
				callback(null, expectedParsedData);
			});

			const result = await awsApiRequestSOAPAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual([]);
		});

		it('should work with different function contexts', async () => {
			const mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
			const xmlResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Contents><Key>file1.txt</Key></Contents><IsTruncated>false</IsTruncated></ListBucketResult>';

			const expectedParsedData = {
				ListBucketResult: {
					Contents: [{ Key: 'file1.txt' }],
					IsTruncated: 'false',
				},
			};

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as any).mockResolvedValue(
				xmlResponse,
			);
			mockParseString.mockImplementation((_, __, callback) => {
				callback(null, expectedParsedData);
			});

			const result = await awsApiRequestSOAPAllItems.call(
				mockLoadOptionsFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual([{ Key: 'file1.txt' }]);
		});
	});
});
