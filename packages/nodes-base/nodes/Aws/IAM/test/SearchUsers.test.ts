import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchUsers, awsRequest } from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	awsRequest: jest.fn(),
	searchUsers: jest.fn(),
}));

describe('searchUsers', () => {
	const mockGetNodeParameter = jest.fn();
	const mockAwsRequest = awsRequest as jest.Mock;
	const mockSearchUsers = searchUsers as jest.Mock;

	const mockContext = {
		getNodeParameter: mockGetNodeParameter,
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		mockGetNodeParameter.mockClear();
		mockAwsRequest.mockClear();
		mockSearchUsers.mockClear();
	});

	it('should throw an error if filter is missing', async () => {
		await expect(searchUsers.call(mockContext)).rejects.toThrow('Filter is required');
	});

	it('should make a POST request to search users and return results', async () => {
		const mockUsersResponse = {
			ListUsersResponse: {
				ListUsersResult: {
					Users: [{ UserName: 'user1' }, { UserName: 'user2' }],
				},
			},
		};

		mockAwsRequest.mockResolvedValueOnce(mockUsersResponse);

		const response = await searchUsers.call(mockContext, 'user1');

		expect(mockAwsRequest).toHaveBeenCalledWith({
			method: 'POST',
			url: '/?Action=ListUsers&Version=2010-05-08',
		});

		expect(response).toEqual({
			results: [
				{ name: 'User1', value: 'user1' },
				{ name: 'User2', value: 'user2' },
			],
		});
	});

	it('should handle pagination correctly', async () => {
		const mockUsersResponsePage1 = {
			ListUsersResponse: {
				ListUsersResult: {
					Users: [{ UserName: 'user1' }, { UserName: 'user2' }],
				},
				Marker: 'nextToken',
			},
		};

		const mockUsersResponsePage2 = {
			ListUsersResponse: {
				ListUsersResult: {
					Users: [{ UserName: 'user3' }],
				},
			},
		};

		mockAwsRequest
			.mockResolvedValueOnce(mockUsersResponsePage1)
			.mockResolvedValueOnce(mockUsersResponsePage2);

		const response = await searchUsers.call(mockContext, 'user');

		expect(mockAwsRequest).toHaveBeenCalledTimes(2);
		expect(response).toEqual({
			results: [
				{ name: 'User1', value: 'user1' },
				{ name: 'User2', value: 'user2' },
				{ name: 'User3', value: 'user3' },
			],
		});
	});

	it('should return empty results if no users are found', async () => {
		mockAwsRequest.mockResolvedValueOnce({
			ListUsersResponse: {
				ListUsersResult: {
					Users: [],
				},
			},
		});

		const response = await searchUsers.call(mockContext, 'nonexistent');

		expect(response).toEqual({ results: [] });
	});

	it('should handle invalid filter and return no results', async () => {
		mockAwsRequest.mockResolvedValueOnce({
			ListUsersResponse: {
				ListUsersResult: {
					Users: [{ UserName: 'user1' }, { UserName: 'user2' }],
				},
			},
		});

		const response = await searchUsers.call(mockContext, 'nonexistent');

		expect(response).toEqual({ results: [] });
	});

	it('should throw an error if AWS request fails', async () => {
		mockAwsRequest.mockRejectedValueOnce(new Error('AWS request failed'));

		await expect(searchUsers.call(mockContext)).rejects.toThrow('AWS request failed');
	});
});
