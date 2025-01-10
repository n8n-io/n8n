import { presendStringifyBody } from '../GenericFunctions';
describe('presendStringifyBody', () => {
	let mockContext: any;

	beforeEach(() => {
		mockContext = {
			getNodeParameter: jest.fn(),
		};
	});

	test('should stringify requestOptions.body when it is an object', async () => {
		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: { key: 'value' },
			headers: {},
		};

		const result = await presendStringifyBody.call(mockContext, requestOptions);

		expect(result.body).toBe(JSON.stringify({ key: 'value' }));
	});

	test('should not modify requestOptions if body is undefined', async () => {
		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: undefined,
			headers: {},
		};

		const result = await presendStringifyBody.call(mockContext, requestOptions);

		expect(result.body).toBeUndefined();
	});

	test('should handle an empty body', async () => {
		const requestOptions = {
			method: 'POST' as const,
			url: '/example-endpoint',
			body: {},
			headers: {},
		};

		const result = await presendStringifyBody.call(mockContext, requestOptions);
		expect(result.body).toBe('{}');
	});
});
