import { NodeApiError, type IExecuteSingleFunctions, type IHttpRequestOptions } from 'n8n-workflow';

import { processAttributes } from '../GenericFunctions';

describe('processAttributes', () => {
	let mockContext: IExecuteSingleFunctions;

	beforeEach(() => {
		mockContext = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => ({
				name: 'TestNode',
			})),
		} as unknown as IExecuteSingleFunctions;
	});

	it('should process attributes and append them to the request body', async () => {
		const initialBody = { key: 'value' };

		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce([
			{ Name: 'email', Value: 'test@example.com' },
			{ Name: 'custom:role', Value: 'admin' },
		]);

		const requestOptions: IHttpRequestOptions = {
			body: JSON.stringify(initialBody),
			url: '',
		};

		const result = await processAttributes.call(mockContext, requestOptions);

		expect(result.body).toEqual(
			JSON.stringify({
				...initialBody,
				UserAttributes: [
					{ Name: 'email', Value: 'test@example.com' },
					{ Name: 'custom:role', Value: 'admin' },
				],
			}),
		);
	});

	it('should handle an existing object as the request body', async () => {
		const initialBody = { key: 'value' };

		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce([
			{ Name: 'email', Value: 'user@example.com' },
		]);

		const requestOptions: IHttpRequestOptions = {
			body: initialBody,
			url: '',
		};

		const result = await processAttributes.call(mockContext, requestOptions);

		expect(result.body).toEqual(
			JSON.stringify({
				...initialBody,
				UserAttributes: [{ Name: 'email', Value: 'user@example.com' }],
			}),
		);
	});

	it('should handle an empty attributes array', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce([]);

		const initialBody = { key: 'value' };
		const requestOptions: IHttpRequestOptions = {
			body: JSON.stringify(initialBody),
			url: '',
		};

		await expect(processAttributes.call(mockContext, requestOptions)).rejects.toThrowError(
			new NodeApiError(mockContext.getNode(), {
				message: 'No user attribute provided',
				description: 'At least one attribute must be provided for the update.',
			}),
		);
	});
});
