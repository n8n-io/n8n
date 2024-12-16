import { presendPath } from '../GenericFunctions';
import { NodeOperationError } from 'n8n-workflow';

describe('presendPath', () => {
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

		const result = await presendPath.call(mockContext, requestOptions);

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

		await expect(presendPath.call(mockContext, requestOptions)).rejects.toThrow(
			new NodeOperationError(mockContext.getNode(), 'Path must be between 1 and 512 characters.'),
		);
	});

	test('should throw an error if path is too long', async () => {
		mockGetNodeParameter.mockReturnValueOnce('/' + 'a'.repeat(513) + '/');

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
			body: {},
		};

		await expect(presendPath.call(mockContext, requestOptions)).rejects.toThrow(
			new NodeOperationError(mockContext.getNode(), 'Path must be between 1 and 512 characters.'),
		);
	});

	test('should throw an error if path does not start and end with a slash', async () => {
		// Mocking the return value of getNodeParameter for the path
		mockGetNodeParameter.mockReturnValueOnce('invalidpath');

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
			body: {},
		};

		await expect(presendPath.call(mockContext, requestOptions)).rejects.toThrow(
			new NodeOperationError(
				mockContext.getNode(),
				'Path must begin and end with a forward slash and contain valid ASCII characters.',
			),
		);
	});

	test('should throw an error if path contains invalid characters', async () => {
		mockGetNodeParameter.mockReturnValueOnce('/invalid!path');

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			headers: {},
			body: {},
		};

		await expect(presendPath.call(mockContext, requestOptions)).rejects.toThrow(
			new NodeOperationError(
				mockContext.getNode(),
				'Path must begin and end with a forward slash and contain valid ASCII characters.',
			),
		);
	});
});
