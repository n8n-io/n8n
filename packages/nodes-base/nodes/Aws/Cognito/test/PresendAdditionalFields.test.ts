import { NodeApiError } from 'n8n-workflow';

import { presendAdditionalFields } from '../generalFunctions/presendFunctions';

describe('presendAdditionalFields', () => {
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

		const result = await presendAdditionalFields.call(mockContext, requestOptions);

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

		await expect(presendAdditionalFields.call(mockContext, requestOptions)).rejects.toThrow(
			new NodeApiError(mockContext.getNode(), {
				message: 'No group field provided',
				description: 'Select at least one additional field to update.',
			}),
		);
	});
});
