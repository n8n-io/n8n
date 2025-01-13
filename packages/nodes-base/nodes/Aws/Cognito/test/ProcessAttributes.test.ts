import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { processAttributes } from '../GenericFunctions';

describe('processAttributes', () => {
	let mockContext: IExecuteSingleFunctions;

	beforeEach(() => {
		mockContext = {
			getNodeParameter: jest.fn(),
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

	it('should handle an empty attributes array gracefully', async () => {
		const initialBody = { key: 'value' };

		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce([]);

		const requestOptions: IHttpRequestOptions = {
			body: JSON.stringify(initialBody),
			url: '',
		};

		const result = await processAttributes.call(mockContext, requestOptions);

		expect(result.body).toEqual(
			JSON.stringify({
				...initialBody,
				UserAttributes: [],
			}),
		);
	});
});
