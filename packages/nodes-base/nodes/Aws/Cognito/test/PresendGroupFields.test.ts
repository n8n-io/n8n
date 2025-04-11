import type { IHttpRequestOptions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { presendGroupFields } from '../generalFunctions/presendFunctions';

describe('presendGroupFields', () => {
	let mockContext: any;
	let mockRequestOptions: IHttpRequestOptions;

	beforeEach(() => {
		mockContext = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(),
		};

		mockRequestOptions = { body: '{}', url: 'https://mock-cognito-endpoint.amazonaws.com' };
	});

	it('should return requestOptions if NewGroupName is valid', async () => {
		mockContext.getNodeParameter.mockReturnValue('validGroupName123');

		const result = await presendGroupFields.call(mockContext, mockRequestOptions);

		expect(result).toEqual(mockRequestOptions);
	});

	it('should throw an error if NewGroupName contains spaces', async () => {
		mockContext.getNodeParameter.mockReturnValue('invalid group name');

		await expect(presendGroupFields.call(mockContext, mockRequestOptions)).rejects.toThrowError(
			NodeApiError,
		);

		try {
			await presendGroupFields.call(mockContext, mockRequestOptions);
		} catch (e) {
			expect(e).toBeInstanceOf(NodeApiError);
			expect(e.message).toBe('Invalid format for Group Name');
			expect(e.description).toBe('Group Name should not contain spaces.');
		}
	});

	it('should throw an error if NewGroupName is empty', async () => {
		mockContext.getNodeParameter.mockReturnValue('');

		await expect(presendGroupFields.call(mockContext, mockRequestOptions)).rejects.toThrowError(
			NodeApiError,
		);

		try {
			await presendGroupFields.call(mockContext, mockRequestOptions);
		} catch (e) {
			expect(e).toBeInstanceOf(NodeApiError);
			expect(e.message).toBe('Invalid format for Group Name');
			expect(e.description).toBe('Group Name should not contain spaces.');
		}
	});

	it('should throw an error if NewGroupName contains spaces', async () => {
		mockContext.getNodeParameter.mockReturnValue('invalid group name');

		await expect(presendGroupFields.call(mockContext, mockRequestOptions)).rejects.toThrowError(
			NodeApiError,
		);

		try {
			await presendGroupFields.call(mockContext, mockRequestOptions);
		} catch (e) {
			expect(e).toBeInstanceOf(NodeApiError);
			expect(e.message).toBe('Invalid format for Group Name');
			expect(e.description).toBe('Group Name should not contain spaces.');
		}
	});
});
