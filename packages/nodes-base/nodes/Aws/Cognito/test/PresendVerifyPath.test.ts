import { NodeApiError } from 'n8n-workflow';

import { presendVerifyPath } from '../generalFunctions/presendFunctions';

describe('presendVerifyPath', () => {
	let mockContext: any;
	let mockGetNodeParameter: jest.Mock;

	beforeEach(() => {
		mockGetNodeParameter = jest.fn();
		mockContext = {
			getNodeParameter: mockGetNodeParameter,
			getNode: jest.fn(),
		};
	});

	test('should return request options when path is valid', async () => {
		mockGetNodeParameter.mockReturnValueOnce('/valid/path/');

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
			body: {},
		};

		const result = await presendVerifyPath.call(mockContext, requestOptions);

		expect(result).toEqual(requestOptions);
	});

	test('should throw an error if path is too short', async () => {
		mockGetNodeParameter.mockReturnValueOnce('');

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
			body: {},
		};

		await expect(presendVerifyPath.call(mockContext, requestOptions)).rejects.toThrow(NodeApiError);
	});

	test('should throw an error if path is too long', async () => {
		mockGetNodeParameter.mockReturnValueOnce('/' + 'a'.repeat(513) + '/');

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
			body: {},
		};

		await expect(presendVerifyPath.call(mockContext, requestOptions)).rejects.toThrow(NodeApiError);
	});

	test('should throw an error if path does not start and end with a slash', async () => {
		mockGetNodeParameter.mockReturnValueOnce('invalidpath');

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
			body: {},
		};

		await expect(presendVerifyPath.call(mockContext, requestOptions)).rejects.toThrow(NodeApiError);
	});

	test('should throw an error if path contains invalid characters', async () => {
		mockGetNodeParameter.mockReturnValueOnce('/invalid!path');

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
			body: {},
		};

		await expect(presendVerifyPath.call(mockContext, requestOptions)).rejects.toThrow(NodeApiError);
	});
});
