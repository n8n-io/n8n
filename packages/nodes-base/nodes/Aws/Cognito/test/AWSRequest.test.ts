import { awsRequest } from '../GenericFunctions';

describe('GenericFunctions - awsRequest', () => {
	let mockContext: any;
	let mockRequestWithAuthentication: jest.Mock;
	let mockGetCredentials: jest.Mock;

	beforeEach(() => {
		mockRequestWithAuthentication = jest.fn();
		mockGetCredentials = jest.fn();
		mockContext = {
			helpers: {
				requestWithAuthentication: mockRequestWithAuthentication,
			},
			getCredentials: mockGetCredentials,
		};
	});

	test('should make a successful request with correct options', async () => {
		// Mock credentials and response
		mockGetCredentials.mockResolvedValueOnce({ region: 'us-west-2' });
		mockRequestWithAuthentication.mockResolvedValueOnce({ success: true });

		// Define request options with correct type for method
		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {
				'X-Amz-Target': 'ExampleService.Action',
			},
			body: { key: 'value' },
		};

		const result = await awsRequest.call(mockContext, requestOptions);

		// Validate the request call
		expect(mockGetCredentials).toHaveBeenCalledWith('aws');
		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'aws',
			expect.objectContaining({
				method: 'POST',
				baseURL: 'https://cognito-idp.us-west-2.amazonaws.com',
				headers: expect.objectContaining({
					'Content-Type': 'application/x-amz-json-1.1',
					'X-Amz-Target': 'ExampleService.Action',
				}),
				body: { key: 'value' },
				json: true,
			}),
		);

		expect(result).toEqual({ success: true });
	});

	test('should throw an error if AWS credentials are invalid (403)', async () => {
		// Mock credentials and response
		mockGetCredentials.mockResolvedValueOnce({ region: 'us-west-2' });
		mockRequestWithAuthentication.mockRejectedValueOnce({
			statusCode: 403,
			response: {
				body: { message: 'The security token included in the request is invalid.' },
			},
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
		};

		await expect(awsRequest.call(mockContext, requestOptions)).rejects.toThrow(
			'The AWS credentials are not valid!',
		);

		expect(mockRequestWithAuthentication).toHaveBeenCalled();
	});

	test('should throw a descriptive error for other AWS errors', async () => {
		// Mock credentials and response
		mockGetCredentials.mockResolvedValueOnce({ region: 'us-east-1' });
		mockRequestWithAuthentication.mockRejectedValueOnce({
			statusCode: 400,
			response: {
				body: { message: 'Invalid request parameter' },
			},
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
		};

		await expect(awsRequest.call(mockContext, requestOptions)).rejects.toThrow(
			'AWS error response [400]: Invalid request parameter',
		);
	});

	test('should handle unexpected error structures gracefully', async () => {
		// Mock credentials and response
		mockGetCredentials.mockResolvedValueOnce({ region: 'us-east-1' });
		mockRequestWithAuthentication.mockRejectedValueOnce({
			cause: { error: { message: 'Something went wrong' } },
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
		};

		await expect(awsRequest.call(mockContext, requestOptions)).rejects.toThrow(
			'AWS error response [undefined]: Something went wrong',
		);
	});

	test('should throw a generic error if no meaningful information is provided', async () => {
		// Mock credentials and response
		mockGetCredentials.mockResolvedValueOnce({ region: 'us-east-1' });
		mockRequestWithAuthentication.mockRejectedValueOnce({
			statusCode: 500,
			message: 'Internal Server Error',
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
		};

		await expect(awsRequest.call(mockContext, requestOptions)).rejects.toThrow(
			'AWS error response [500]: Internal Server Error',
		);
	});
});
