import { presendFilter } from '../GenericFunctions';
import { NodeOperationError } from 'n8n-workflow';

describe('presendFilter', () => {
	let mockContext: any;

	beforeEach(() => {
		mockContext = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => ({
				name: 'TestNode',
			})),
		};
	});

	test('should return request options with applied filter when all parameters are provided', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'additionalFields') {
				return { filterAttribute: 'name', filterType: 'exactMatch', filterValue: 'John' };
			}
			return {};
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: {},
			headers: {},
		};

		const result = await presendFilter.call(mockContext, requestOptions);

		expect(result.body).toBe(
			JSON.stringify({
				Filter: 'name = "John"',
			}),
		);
	});

	test('should throw an error if any filter parameter is missing', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'additionalFields') {
				return { filterAttribute: 'name', filterType: 'exactMatch' };
			}
			return {};
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: {},
			headers: {},
		};

		await expect(presendFilter.call(mockContext, requestOptions)).rejects.toThrow(
			new NodeOperationError(
				mockContext.getNode(),
				'Please provide Filter Attribute, Filter Type, and Filter Value to use filtering.',
			),
		);
	});

	test('should parse requestOptions.body if it is a string', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'additionalFields') {
				return { filterAttribute: 'name', filterType: 'startsWith', filterValue: 'Jo' };
			}
			return {};
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: '{"key":"value"}',
			headers: {},
		};

		const result = await presendFilter.call(mockContext, requestOptions);

		expect(result.body).toBe(
			JSON.stringify({
				key: 'value',
				Filter: 'name ^= "Jo"',
			}),
		);
	});

	test('should not parse requestOptions.body if it is already an object', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'additionalFields') {
				return {
					filterAttribute: 'email',
					filterType: 'exactMatch',
					filterValue: 'test@example.com',
				};
			}
			return {};
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: { key: 'value' },
			headers: {},
		};

		const result = await presendFilter.call(mockContext, requestOptions);

		expect(result.body).toBe(
			JSON.stringify({
				key: 'value',
				Filter: 'email = "test@example.com"',
			}),
		);
	});

	test('should handle unsupported filterType values by defaulting to the provided filterType', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'additionalFields') {
				return { filterAttribute: 'name', filterType: 'unknownType', filterValue: 'John' };
			}
			return {};
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: { key: 'value' },
			headers: {},
		};

		const result = await presendFilter.call(mockContext, requestOptions);

		expect(result.body).toBe(
			JSON.stringify({
				key: 'value',
				Filter: 'name unknownType "John"',
			}),
		);
	});
});
