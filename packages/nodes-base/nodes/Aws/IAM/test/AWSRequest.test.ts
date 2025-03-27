import { awsRequest } from '../GenericFunctions';

describe('GenericFunctions - awsRequest', () => {
	let mockContext: any;
	let mockRequestWithAuthentication: jest.Mock;

	beforeEach(() => {
		mockRequestWithAuthentication = jest.fn();
		mockContext = {
			helpers: {
				requestWithAuthentication: mockRequestWithAuthentication,
			},
		};
	});

	test('should make a successful request with correct options', async () => {
		mockRequestWithAuthentication.mockResolvedValueOnce({ success: true });

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'X-Amz-Target': 'ExampleService.Action',
			},
			body: { key: 'value' },
		};

		const result = await awsRequest.call(mockContext, requestOptions);

		expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
			'aws',
			expect.objectContaining({
				method: 'POST',
				baseURL: 'https://iam.amazonaws.com',
				url: '/example-endpoint',
				headers: expect.objectContaining({
					'Content-Type': 'application/x-www-form-urlencoded',
				}),
				body: { key: 'value' },
				json: true,
			}),
		);

		expect(result).toEqual({ success: true });
	});

	test('should throw an error if AWS credentials are invalid (403)', async () => {
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

	test('should throw an error if the request signature is invalid', async () => {
		mockRequestWithAuthentication.mockRejectedValueOnce({
			statusCode: 403,
			response: {
				body: {
					message: 'The request signature we calculated does not match the signature you provided',
				},
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

	test('should handle unexpected error structures', async () => {
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
