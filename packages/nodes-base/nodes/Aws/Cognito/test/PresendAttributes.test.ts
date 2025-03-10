import { NodeApiError, type IExecuteSingleFunctions, type IHttpRequestOptions } from 'n8n-workflow';

import { presendAttributes } from '../generalFunctions/presendFunctions';

describe('presendAttributes', () => {
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
			{ attributeType: 'standard', standardName: 'email', Value: 'test@example.com' },
			{ attributeType: 'custom', customName: 'role', Value: 'admin' },
		]);

		const requestOptions: IHttpRequestOptions = {
			body: JSON.stringify(initialBody),
			url: '',
		};

		const result = await presendAttributes.call(mockContext, requestOptions);

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
			{ attributeType: 'standard', standardName: 'email', Value: 'user@example.com' },
		]);

		const requestOptions: IHttpRequestOptions = {
			body: initialBody,
			url: '',
		};

		const result = await presendAttributes.call(mockContext, requestOptions);

		expect(result.body).toEqual(
			JSON.stringify({
				...initialBody,
				UserAttributes: [{ Name: 'email', Value: 'user@example.com' }],
			}),
		);
	});

	it('should throw an error if no user attributes are provided', async () => {
		const initialBody = { key: 'value' };

		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce([]);

		const requestOptions: IHttpRequestOptions = {
			body: JSON.stringify(initialBody),
			url: '',
		};

		await expect(presendAttributes.call(mockContext, requestOptions)).rejects.toThrowError(
			'No user field provided',
		);
	});

	it('should throw an error if an attribute does not have a value', async () => {
		const initialBody = { key: 'value' };

		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce([
			{ attributeType: 'standard', standardName: 'email', Value: '' },
		]);

		const requestOptions: IHttpRequestOptions = {
			body: JSON.stringify(initialBody),
			url: '',
		};

		await expect(presendAttributes.call(mockContext, requestOptions)).rejects.toThrowError(
			'Invalid User Attribute',
		);
	});

	it('should throw an error if an attribute has an invalid name', async () => {
		const initialBody = { key: 'value' };

		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce([
			{ attributeType: 'standard', standardName: '', Value: 'test@example.com' },
		]);

		const requestOptions: IHttpRequestOptions = {
			body: JSON.stringify(initialBody),
			url: '',
		};

		await expect(presendAttributes.call(mockContext, requestOptions)).rejects.toThrowError(
			'Invalid Attribute Name',
		);
	});

	it('should handle an empty attributes array', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValueOnce([]);

		const initialBody = { key: 'value' };
		const requestOptions: IHttpRequestOptions = {
			body: JSON.stringify(initialBody),
			url: '',
		};

		await expect(presendAttributes.call(mockContext, requestOptions)).rejects.toThrowError(
			new NodeApiError(mockContext.getNode(), {
				message: 'No user field provided',
				description: 'At least one attribute must be provided for the update.',
			}),
		);
	});
});
