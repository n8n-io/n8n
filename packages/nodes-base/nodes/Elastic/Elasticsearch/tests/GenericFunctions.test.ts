import {
	type IExecuteFunctions,
	NodeApiError,
	requestPath,
	requestUrl,
	UserError,
} from 'n8n-workflow';

import { elasticsearchApiRequest, elasticsearchApiRequestAllItems } from '../GenericFunctions';

describe('Elasticsearch -> elasticsearchApiRequest', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	const mockHttpRequestWithAuthentication = vi.fn();

	const setupMockFunctions = () => {
		mockExecuteFunctions = {
			getCredentials: vi.fn().mockResolvedValue({
				baseUrl: 'https://example.com',
				ignoreSSLIssues: false,
			}),
			helpers: {
				httpRequestWithAuthentication: mockHttpRequestWithAuthentication,
			},
			getNode: vi.fn().mockReturnValue({}),
		} as unknown as IExecuteFunctions;
		vi.clearAllMocks();
	};

	beforeEach(() => {
		setupMockFunctions();
		mockHttpRequestWithAuthentication.mockClear();
	});

	const response = { success: true };

	it('should make a successful GET API request', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValue(response);

		const result = await elasticsearchApiRequest.call(
			mockExecuteFunctions,
			'GET',
			requestPath`/test-endpoint`,
		);

		expect(result).toEqual(response);
		expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'elasticsearchApi',
			expect.objectContaining({
				method: 'GET',
				url: requestUrl`https://example.com/test-endpoint`,
				json: true,
				skipSslCertificateValidation: false,
			}),
		);
	});

	it('should make a successful POST API request', async () => {
		const body = { key: 'value' };

		mockHttpRequestWithAuthentication.mockResolvedValue(response);

		const result = await elasticsearchApiRequest.call(
			mockExecuteFunctions,
			'POST',
			requestPath`/test-endpoint`,
			body,
		);

		expect(result).toEqual(response);
		expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'elasticsearchApi',
			expect.objectContaining({
				body,
				method: 'POST',
				url: requestUrl`https://example.com/test-endpoint`,
				json: true,
				skipSslCertificateValidation: false,
			}),
		);
	});

	it('should handle API request errors', async () => {
		const errorResponse = { message: 'Error occurred' };
		mockHttpRequestWithAuthentication.mockRejectedValue(errorResponse);

		await expect(
			elasticsearchApiRequest.call(mockExecuteFunctions, 'GET', requestPath`/test-endpoint`),
		).rejects.toThrow(NodeApiError);

		expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'elasticsearchApi',
			expect.objectContaining({
				method: 'GET',
				url: requestUrl`https://example.com/test-endpoint`,
				json: true,
				skipSslCertificateValidation: false,
			}),
		);
	});

	it('should ignore trailing slashes in the base URL', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValue(response);

		mockExecuteFunctions.getCredentials = vi.fn().mockResolvedValue({
			baseUrl: 'https://elastic.domain.com/',
			ignoreSSLIssues: false,
		});
		await elasticsearchApiRequest.call(mockExecuteFunctions, 'GET', requestPath`/test-endpoint`);

		expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'elasticsearchApi',
			expect.objectContaining({
				url: requestUrl`https://elastic.domain.com/test-endpoint`,
			}),
		);
	});

	it('should encode a plus sign in the index and document ID', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValue(response);

		await elasticsearchApiRequest.call(
			mockExecuteFunctions,
			'GET',
			requestPath`/${'logs+2024'}/_doc/${'a+b'}`,
		);

		expect(String(mockHttpRequestWithAuthentication.mock.calls[0][1].url)).toBe(
			'https://example.com/logs%2B2024/_doc/a%2Bb',
		);
	});
});

describe('Elasticsearch -> elasticsearchApiRequestAllItems', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	const mockHttpRequestWithAuthentication = vi.fn();

	beforeEach(() => {
		mockExecuteFunctions = {
			getCredentials: vi.fn().mockResolvedValue({
				baseUrl: 'https://example.com',
				ignoreSSLIssues: false,
			}),
			helpers: {
				httpRequestWithAuthentication: mockHttpRequestWithAuthentication,
			},
			getNode: vi.fn().mockReturnValue({}),
		} as unknown as IExecuteFunctions;
		mockHttpRequestWithAuthentication.mockClear();
	});

	it('should reject an invalid index id before making any request', async () => {
		await expect(
			elasticsearchApiRequestAllItems.call(mockExecuteFunctions, '..', {}, {}),
		).rejects.toThrow(UserError);

		expect(mockHttpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('should encode the index ID in the point in time request URL', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValue({});

		await elasticsearchApiRequestAllItems.call(mockExecuteFunctions, 'my-index/_doc', {}, {});

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			'elasticsearchApi',
			expect.objectContaining({
				method: 'POST',
				url: requestUrl`https://example.com/my-index%2F_doc/_pit`,
			}),
		);
	});
});
