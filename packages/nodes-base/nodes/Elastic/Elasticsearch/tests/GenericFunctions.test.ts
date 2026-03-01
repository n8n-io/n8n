import { type IExecuteFunctions, NodeApiError } from 'n8n-workflow';

import { elasticsearchApiRequest } from '../GenericFunctions';

describe('Elasticsearch -> elasticsearchApiRequest', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	const mockHttpRequestWithAuthentication = jest.fn();

	const setupMockFunctions = () => {
		mockExecuteFunctions = {
			getCredentials: jest.fn().mockResolvedValue({
				baseUrl: 'https://example.com',
				ignoreSSLIssues: false,
			}),
			helpers: {
				httpRequestWithAuthentication: mockHttpRequestWithAuthentication,
			},
			getNode: jest.fn().mockReturnValue({}),
		} as unknown as IExecuteFunctions;
		jest.clearAllMocks();
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
			'/test-endpoint',
		);

		expect(result).toEqual(response);
		expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'elasticsearchApi',
			expect.objectContaining({
				method: 'GET',
				url: 'https://example.com/test-endpoint',
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
			'/test-endpoint',
			body,
		);

		expect(result).toEqual(response);
		expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'elasticsearchApi',
			expect.objectContaining({
				body,
				method: 'POST',
				url: 'https://example.com/test-endpoint',
				json: true,
				skipSslCertificateValidation: false,
			}),
		);
	});

	it('should handle API request errors', async () => {
		const errorResponse = { message: 'Error occurred' };
		mockHttpRequestWithAuthentication.mockRejectedValue(errorResponse);

		await expect(
			elasticsearchApiRequest.call(mockExecuteFunctions, 'GET', '/test-endpoint'),
		).rejects.toThrow(NodeApiError);

		expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'elasticsearchApi',
			expect.objectContaining({
				method: 'GET',
				url: 'https://example.com/test-endpoint',
				json: true,
				skipSslCertificateValidation: false,
			}),
		);
	});

	it('should ignore trailing slashes in the base URL', async () => {
		mockHttpRequestWithAuthentication.mockResolvedValue(response);

		mockExecuteFunctions.getCredentials = jest.fn().mockResolvedValue({
			baseUrl: 'https://elastic.domain.com/',
			ignoreSSLIssues: false,
		});
		await elasticsearchApiRequest.call(mockExecuteFunctions, 'GET', '/test-endpoint');

		expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'elasticsearchApi',
			expect.objectContaining({
				url: 'https://elastic.domain.com/test-endpoint',
			}),
		);
	});
});
