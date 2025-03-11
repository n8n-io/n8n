import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { presendFilters } from '../generalFunctions/presendFunctions';

describe('presendFilters', () => {
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
			if (param === 'filters') {
				return { filter: { attribute: 'name', value: 'John' } };
			}
			return {};
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: {},
			headers: {},
		};

		const result = await presendFilters.call(mockContext, requestOptions);

		expect(result.body).toBe(
			JSON.stringify({
				Filter: '"name"^="John"',
			}),
		);
	});

	test('should throw an error if any filter parameter is missing', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'filters') {
				return { filter: { attribute: 'name' } };
			}
			return {};
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: {},
			headers: {},
		};

		await expect(presendFilters.call(mockContext, requestOptions)).rejects.toThrow(NodeApiError);
	});

	test('should parse requestOptions.body if it is a string', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'filters') {
				return { filter: { attribute: 'name', value: 'Jo' } };
			}
			return {};
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: '{"key":"value"}',
			headers: {},
		};

		const result = await presendFilters.call(mockContext, requestOptions);

		expect(result.body).toBe(
			JSON.stringify({
				key: 'value',
				Filter: '"name"^="Jo"',
			}),
		);
	});

	test('should throw an error if requestOptions.body is an invalid JSON string', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'filters') {
				return { filter: { attribute: 'name', value: 'John' } };
			}
			return {};
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: '{invalidJson}',
			headers: {},
		};

		await expect(presendFilters.call(mockContext, requestOptions)).rejects.toThrow(
			new NodeOperationError(mockContext.getNode(), 'Failed to parse requestOptions body'),
		);
	});

	test('should not parse requestOptions.body if it is already an object', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'filters') {
				return { filter: { attribute: 'email', value: 'test@example.com' } };
			}
			return {};
		});

		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: { key: 'value' },
			headers: {},
		};

		const result = await presendFilters.call(mockContext, requestOptions);

		expect(result.body).toBe(
			JSON.stringify({
				key: 'value',
				Filter: '"email"^="test@example.com"',
			}),
		);
	});
});
