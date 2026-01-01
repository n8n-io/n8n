import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

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
			const mockRequestWithAuth = mockExecuteFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth.mockResolvedValue(mockResponse);

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
			expect(mockRequestWithAuth).toHaveBeenCalledWith(
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
			const mockRequestWithAuth = mockExecuteFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth.mockResolvedValue(mockResponse);

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

			expect(mockRequestWithAuth).toHaveBeenCalledWith(
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

		it('should parse valid JSON response', async () => {
			const jsonString = JSON.stringify({ id: '123', name: 'test' });
			const mockRequestWithAuth = mockExecuteFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth.mockResolvedValue(jsonString);

			const result = await awsApiRequestREST.call(mockExecuteFunctions, 's3', 'GET', '/bucket');

			expect(result).toEqual({ id: '123', name: 'test' });
		});

		it('should return raw response when JSON parsing fails', async () => {
			const rawResponse = 'not valid json';
			const mockRequestWithAuth = mockExecuteFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth.mockResolvedValue(rawResponse);

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

		it('should parse valid XML response', async () => {
			const xmlResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>test-bucket</Name></ListBucketResult>';

			const mockRequestWithAuth = mockExecuteFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth.mockResolvedValue(xmlResponse);

			const result = await awsApiRequestSOAP.call(mockExecuteFunctions, 's3', 'GET', '/bucket');

			expect(result).toHaveProperty('ListBucketResult.Name', 'test-bucket');
		});

		it('should return error when XML parsing fails', async () => {
			const invalidXml = 'not valid xml';

			const mockRequestWithAuth = mockExecuteFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth.mockResolvedValue(invalidXml);

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

			const mockRequestWithAuth = mockExecuteFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth.mockResolvedValue(xmlResponse);

			const result = await awsApiRequestSOAPAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toHaveLength(2);
			expect(result).toEqual([
				{ Key: 'file1.txt', Size: '1024' },
				{ Key: 'file2.txt', Size: '2048' },
			]);
			expect(mockRequestWithAuth).toHaveBeenCalledTimes(1);
		});

		it('should handle empty response', async () => {
			const xmlResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>';

			const mockRequestWithAuth = mockExecuteFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth.mockResolvedValue(xmlResponse);

			const result = await awsApiRequestSOAPAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual([]);
			expect(mockRequestWithAuth).toHaveBeenCalledTimes(1);
		});

		it('should handle pagination with NextContinuationToken', async () => {
			const firstPageResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Contents><Key>file1.txt</Key><Size>1024</Size></Contents><IsTruncated>true</IsTruncated><NextContinuationToken>token123</NextContinuationToken></ListBucketResult>';

			const secondPageResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Contents><Key>file2.txt</Key><Size>2048</Size></Contents><IsTruncated>false</IsTruncated></ListBucketResult>';

			const mockRequestWithAuth = mockExecuteFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth
				.mockResolvedValueOnce(firstPageResponse)
				.mockResolvedValueOnce(secondPageResponse);

			const result = await awsApiRequestSOAPAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
				'',
				{},
			);

			expect(result).toHaveLength(2);
			expect(result).toEqual([
				{ Key: 'file1.txt', Size: '1024' },
				{ Key: 'file2.txt', Size: '2048' },
			]);
			expect(mockRequestWithAuth).toHaveBeenCalledTimes(2);

			// Verify that continuation token was passed in the second call
			expect(mockRequestWithAuth).toHaveBeenNthCalledWith(
				2,
				'aws',
				expect.objectContaining({
					qs: expect.objectContaining({
						'continuation-token': 'token123',
					}),
				}),
			);
		});

		it('should respect limit parameter and stop early', async () => {
			const firstPageResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Contents><Key>file1.txt</Key><Size>1024</Size></Contents><Contents><Key>file2.txt</Key><Size>2048</Size></Contents><IsTruncated>true</IsTruncated><NextContinuationToken>token123</NextContinuationToken></ListBucketResult>';

			const secondPageResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Contents><Key>file3.txt</Key><Size>3072</Size></Contents><IsTruncated>false</IsTruncated></ListBucketResult>';

			const mockRequestWithAuth = mockExecuteFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth
				.mockResolvedValueOnce(firstPageResponse)
				.mockResolvedValueOnce(secondPageResponse);

			const result = await awsApiRequestSOAPAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
				'',
				{ limit: 2 },
			);

			// Should stop after collecting 2 items, even though there are more pages
			expect(result).toHaveLength(2);
			expect(result).toEqual([
				{ Key: 'file1.txt', Size: '1024' },
				{ Key: 'file2.txt', Size: '2048' },
			]);
			expect(mockRequestWithAuth).toHaveBeenCalledTimes(1);
		});

		it('should handle single item response (not an array)', async () => {
			const xmlResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Contents><Key>single-file.txt</Key><Size>512</Size></Contents><IsTruncated>false</IsTruncated></ListBucketResult>';

			const mockRequestWithAuth = mockExecuteFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth.mockResolvedValue(xmlResponse);

			const result = await awsApiRequestSOAPAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toHaveLength(1);
			expect(result).toEqual([{ Key: 'single-file.txt', Size: '512' }]);
			expect(mockRequestWithAuth).toHaveBeenCalledTimes(1);
		});

		it('should handle error responses from SOAP parsing', async () => {
			const invalidXml = 'invalid xml response';

			const mockRequestWithAuth = mockExecuteFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth.mockResolvedValue(invalidXml);

			const result = await awsApiRequestSOAPAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			// When XML parsing fails, awsApiRequestSOAP returns an Error object
			// and awsApiRequestSOAPAllItems should handle this gracefully
			expect(result).toEqual([]);
			expect(mockRequestWithAuth).toHaveBeenCalledTimes(1);
		});

		it('should work with different function contexts', async () => {
			const mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
			const xmlResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Contents><Key>file1.txt</Key></Contents><IsTruncated>false</IsTruncated></ListBucketResult>';

			const mockRequestWithAuth = mockLoadOptionsFunctions.helpers
				.requestWithAuthentication as jest.Mock;
			mockRequestWithAuth.mockResolvedValue(xmlResponse);

			const result = await awsApiRequestSOAPAllItems.call(
				mockLoadOptionsFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual([{ Key: 'file1.txt' }]);
			expect(mockRequestWithAuth).toHaveBeenCalledTimes(1);
		});
	});
});
