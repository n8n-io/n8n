import { processUsersResponse } from '../GenericFunctions'; // Adjust the import path as needed
import { ApplicationError } from 'n8n-workflow'; // Assuming ApplicationError is imported from n8n-workflow

describe('processUsersResponse', () => {
	let mockContext: any;
	let items: any[];
	let response: any;

	beforeEach(() => {
		mockContext = {
			// Add mock context properties or methods if needed
		};
		items = [{ json: { someKey: 'someValue' } }];
	});

	test('should process users response correctly', async () => {
		response = {
			body: {
				ListUsersResponse: {
					ListUsersResult: {
						Users: [
							{ UserName: 'user1', UserId: '1' },
							{ UserName: 'user2', UserId: '2' },
						],
					},
				},
			},
		};

		const result = await processUsersResponse.call(mockContext, items, response);

		expect(result).toHaveLength(2);
		expect(result[0].json).toEqual({ UserName: 'user1', UserId: '1' });
		expect(result[1].json).toEqual({ UserName: 'user2', UserId: '2' });
	});

	test('should return an empty array if response contains no users', async () => {
		response = {
			body: {
				ListUsersResponse: {
					ListUsersResult: {
						Users: [],
					},
				},
			},
		};

		const result = await processUsersResponse.call(mockContext, items, response);

		expect(result).toEqual([]);
	});

	test('should throw an error if Users array is missing', async () => {
		response = {
			body: {
				ListUsersResponse: {
					ListUsersResult: {},
				},
			},
		};

		await expect(processUsersResponse.call(mockContext, items, response)).rejects.toThrowError(
			new ApplicationError('Unexpected response format: No users found.'),
		);
	});
});
