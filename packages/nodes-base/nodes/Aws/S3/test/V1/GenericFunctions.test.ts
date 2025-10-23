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

		it('should parse valid JSON response', async () => {
			const jsonString = JSON.stringify({ id: '123', name: 'test' });
			(mockExecuteFunctions.helpers.requestWithAuthentication as any).mockResolvedValue(jsonString);

			const result = await awsApiRequestREST.call(mockExecuteFunctions, 's3', 'GET', '/bucket');

			expect(result).toEqual({ id: '123', name: 'test' });
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

		it('should parse valid XML response', async () => {
			const xmlResponse =
				'<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>test-bucket</Name></ListBucketResult>';

			(mockExecuteFunctions.helpers.requestWithAuthentication as any).mockResolvedValue(
				xmlResponse,
			);

			const result = await awsApiRequestSOAP.call(mockExecuteFunctions, 's3', 'GET', '/bucket');

			expect(result).toHaveProperty('ListBucketResult.Name', 'test-bucket');
		});

		it('should return error when XML parsing fails', async () => {
			const invalidXml = 'not valid xml';

			(mockExecuteFunctions.helpers.requestWithAuthentication as any).mockResolvedValue(invalidXml);

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

			const result = await awsApiRequestSOAPAllItems.call(
				mockExecuteFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ Key: 'file1.txt' }),
					expect.objectContaining({ Key: 'file2.txt' }),
				]),
			);
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

			const result = await awsApiRequestSOAPAllItems.call(
				mockLoadOptionsFunctions,
				'ListBucketResult.Contents',
				's3',
				'GET',
				'/bucket',
			);

			expect(result).toEqual(
				expect.arrayContaining([expect.objectContaining({ Key: 'file1.txt' })]),
			);
		});
	});
});
