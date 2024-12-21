import { processGroupsResponse } from '../GenericFunctions'; // Update the import path as necessary
import { ApplicationError } from 'n8n-workflow'; // Assuming this is the correct location of ApplicationError

describe('processGroupsResponse', () => {
	let mockContext: any;
	let items: any[];
	let response: any;

	beforeEach(() => {
		// Setup the mock context and items.
		mockContext = {
			// Any required properties/methods of IExecuteSingleFunctions, if any.
		};
		items = [{ json: { someKey: 'someValue' } }]; // Mock the items passed to the function
	});

	test('should process groups response correctly', async () => {
		// Mock response with a correct structure
		response = {
			body: {
				ListGroupsResponse: {
					ListGroupsResult: {
						Groups: [
							{ GroupName: 'Group1', GroupId: '1' },
							{ GroupName: 'Group2', GroupId: '2' },
						],
					},
				},
			},
		};

		// Call the function with mock data
		const result = await processGroupsResponse.call(mockContext, items, response);

		// Check if the result is in the expected format
		expect(result).toHaveLength(2);
		expect(result[0].json).toEqual({ GroupName: 'Group1', GroupId: '1' });
		expect(result[1].json).toEqual({ GroupName: 'Group2', GroupId: '2' });
	});

	test('should throw an error if response does not contain groups', async () => {
		// Mock response without groups
		response = {
			body: {
				ListGroupsResponse: {
					ListGroupsResult: {},
				},
			},
		};

		// Call the function and expect an error to be thrown
		await expect(processGroupsResponse.call(mockContext, items, response)).rejects.toThrowError(
			new ApplicationError('Unexpected response format: No groups found.'),
		);
	});
});
