import { processUsersResponse } from '../GenericFunctions';

describe('processUsersResponse', () => {
	let mockContext: any;
	let mockGetNodeParameter: jest.Mock;

	beforeEach(() => {
		mockGetNodeParameter = jest.fn();
		mockContext = {
			getNodeParameter: mockGetNodeParameter,
		};
	});

	it('should process a single user response correctly (GetUserResponse)', async () => {
		const response = {
			body: {
				GetUserResponse: {
					GetUserResult: {
						User: { UserName: 'user1', UserId: '1' },
					},
					ResponseMetadata: {},
				},
			},
			statusCode: 200,
			statusMessage: 'OK',
			headers: {},
		};

		mockGetNodeParameter.mockReturnValue('get');

		const result = await processUsersResponse.call(mockContext, [], response);

		expect(result).toEqual([{ UserName: 'user1', UserId: '1' }]);
	});

	it('should process multiple users response correctly (ListUsersResponse)', async () => {
		const response = {
			body: {
				ListUsersResponse: {
					ListUsersResult: {
						Users: [
							{ UserName: 'user1', UserId: '1' },
							{ UserName: 'user2', UserId: '2' },
						],
					},
					ResponseMetadata: {},
				},
			},
			statusCode: 200,
			statusMessage: 'OK',
			headers: {},
		};

		mockGetNodeParameter.mockReturnValue('getAll');

		const result = await processUsersResponse.call(mockContext, [], response);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ UserName: 'user1', UserId: '1' });
		expect(result[1]).toEqual({ UserName: 'user2', UserId: '2' });
	});
});
