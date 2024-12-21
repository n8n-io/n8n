import { presendOptions } from '../GenericFunctions';
import { NodeOperationError } from 'n8n-workflow';

describe('presendOptions', () => {
	let mockContext: any;

	beforeEach(() => {
		mockContext = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => ({
				name: 'TestNode',
			})),
		};
	});

	test('should return request options if at least one option is provided', async () => {
		mockContext.getNodeParameter.mockReturnValueOnce({
			Description: 'This is a description',
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: {},
			headers: {},
		};

		const result = await presendOptions.call(mockContext, requestOptions);

		expect(result).toEqual(requestOptions);
	});

	test('should throw an error if no options are provided', async () => {
		mockContext.getNodeParameter.mockReturnValueOnce({});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: {},
			headers: {},
		};

		await expect(presendOptions.call(mockContext, requestOptions)).rejects.toThrow(
			new NodeOperationError(
				mockContext.getNode(),
				'At least one of the options (Description, Precedence, Path, or RoleArn) must be provided to update the group.',
			),
		);
	});

	test('should throw an error if options are empty but other parameters are set', async () => {
		mockContext.getNodeParameter.mockReturnValueOnce({});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: {},
			headers: {},
		};

		await expect(presendOptions.call(mockContext, requestOptions)).rejects.toThrow(
			new NodeOperationError(
				mockContext.getNode(),
				'At least one of the options (Description, Precedence, Path, or RoleArn) must be provided to update the group.',
			),
		);
	});
});
