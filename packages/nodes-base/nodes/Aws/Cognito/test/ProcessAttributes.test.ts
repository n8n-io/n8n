import { processAttributes } from '../GenericFunctions';
import { ApplicationError } from 'n8n-workflow';

describe('processAttributes', () => {
	let mockContext: any;
	let mockGetNodeParameter: jest.Mock;

	beforeEach(() => {
		mockGetNodeParameter = jest.fn();
		mockContext = {
			getNodeParameter: mockGetNodeParameter,
		};
	});

	test('should process attributes correctly and update the request body', async () => {
		mockGetNodeParameter.mockReturnValueOnce([
			{ Name: 'email', Value: 'test@example.com' },
			{ Name: 'custom:role', Value: 'admin' },
		]);

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {
				'X-Amz-Target': 'ExampleService.Action',
			},
			body: JSON.stringify({ UserPoolId: 'mockPoolId' }),
		};

		const updatedRequestOptions = await processAttributes.call(mockContext, requestOptions);

		const expectedBody = {
			UserPoolId: 'mockPoolId',
			UserAttributes: [
				{ Name: 'email', Value: 'test@example.com' },
				{ Name: 'custom:role', Value: 'admin' },
			],
		};

		expect(updatedRequestOptions.body).toBe(JSON.stringify(expectedBody));
	});

	test('should throw an error if the body cannot be parsed as JSON', async () => {
		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
			body: 'invalid json body',
		};

		await expect(processAttributes.call(mockContext, requestOptions)).rejects.toThrow(
			new ApplicationError('Invalid JSON body: Unable to parse.'),
		);
	});

	test('should throw an error if the body is not a string or object', async () => {
		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
			body: undefined,
		};

		await expect(processAttributes.call(mockContext, requestOptions)).rejects.toThrow(
			new ApplicationError('Invalid request body: Expected a JSON string or object.'),
		);
	});

	test('should process attributes with custom prefix correctly', async () => {
		mockGetNodeParameter.mockReturnValueOnce([{ Name: 'custom:age', Value: '30' }]);

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
			body: JSON.stringify({ UserPoolId: 'mockPoolId' }),
		};

		const updatedRequestOptions = await processAttributes.call(mockContext, requestOptions);

		const expectedBody = {
			UserPoolId: 'mockPoolId',
			UserAttributes: [{ Name: 'custom:age', Value: '30' }],
		};

		expect(updatedRequestOptions.body).toBe(JSON.stringify(expectedBody));
	});
});
