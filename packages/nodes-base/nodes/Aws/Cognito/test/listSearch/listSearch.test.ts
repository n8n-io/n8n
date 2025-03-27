import {
	ApplicationError,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
} from 'n8n-workflow';

import {
	searchUsers,
	searchGroups,
	searchUserPools,
	searchGroupsForUser,
} from '../../methods/listSearch';
import { makeAwsRequest } from '../../transport/index';

jest.mock('../transport', () => ({
	makeAwsRequest: jest.fn(),
}));

describe('AWS Cognito Functions', () => {
	describe('searchUsers', () => {
		it('should return user results and pagination token when users are found', async () => {
			const mockResponse = {
				Users: [
					{
						Username: 'User1',
						Attributes: [
							{ Name: 'email', Value: 'user1@example.com' },
							{ Name: 'phone_number', Value: '1234567890' },
							{ Name: 'sub', Value: 'sub1' },
						],
					},
					{
						Username: 'User2',
						Attributes: [
							{ Name: 'email', Value: 'user2@example.com' },
							{ Name: 'phone_number', Value: '9876543210' },
							{ Name: 'sub', Value: 'sub2' },
						],
					},
				],
				NextToken: 'next-token',
			};

			(makeAwsRequest as jest.Mock).mockResolvedValue(mockResponse);

			const mockContext = {
				getNodeParameter: jest.fn((param) => {
					if (param === 'userPoolId') {
						return { value: 'user-pool-id' };
					}
					return null;
				}),
			} as unknown as ILoadOptionsFunctions;

			const result = await searchUsers.call(mockContext, '', '');

			const expectedResult: INodeListSearchResult = {
				results: [
					{ name: 'User1', value: 'sub1' },
					{ name: 'User2', value: 'sub2' },
				],
				paginationToken: 'next-token',
			};

			expect(result).toEqual(expectedResult);
			expect(makeAwsRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					url: '',
					method: 'POST',
					headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers' },
					body: expect.stringContaining('UserPoolId'),
				}),
			);
		});

		it('should throw an error if UserPoolId is missing', async () => {
			const mockContext = {
				getNodeParameter: jest.fn().mockReturnValue({ value: '' }),
			} as unknown as ILoadOptionsFunctions;

			await expect(searchUsers.call(mockContext)).rejects.toThrow(ApplicationError);
		});
	});

	describe('searchGroups', () => {
		it('should return group results and pagination token when groups are found', async () => {
			const mockResponse = {
				Groups: [
					{ GroupName: 'group1', UserPoolId: 'user-pool-id' },
					{ GroupName: 'group2', UserPoolId: 'user-pool-id' },
				],
				NextToken: 'next-token',
			};

			(makeAwsRequest as jest.Mock).mockResolvedValue(mockResponse);

			const mockContext = {
				getNodeParameter: jest.fn((param) => {
					if (param === 'userPoolId') {
						return { value: 'user-pool-id' };
					}
					return null;
				}),
			} as unknown as ILoadOptionsFunctions;

			const result = await searchGroups.call(mockContext, '', '');

			const expectedResult: INodeListSearchResult = {
				results: [
					{ name: 'group1', value: 'group1' },
					{ name: 'group2', value: 'group2' },
				],
				paginationToken: 'next-token',
			};

			expect(result).toEqual(expectedResult);
			expect(makeAwsRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					url: '',
					method: 'POST',
					headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
					body: expect.stringContaining('UserPoolId'),
				}),
			);
		});

		it('should throw an error if UserPoolId is missing', async () => {
			const mockContext = {
				getNodeParameter: jest.fn().mockReturnValue(null),
			} as unknown as ILoadOptionsFunctions;

			await expect(searchGroups.call(mockContext)).rejects.toThrow(ApplicationError);
		});
	});

	describe('searchUserPools', () => {
		it('should return user pool results and pagination token when user pools are found', async () => {
			const mockResponse = {
				UserPools: [
					{ Id: 'pool1', Name: 'User Pool 1' },
					{ Id: 'pool2', Name: 'User Pool 2' },
				],
				NextToken: 'next-token',
			};

			(makeAwsRequest as jest.Mock).mockResolvedValue(mockResponse);

			const mockContext = {
				getNodeParameter: jest.fn((param) => {
					if (param === 'userPoolId') {
						return { value: 'user-pool-id' };
					}
					return null;
				}),
			} as unknown as ILoadOptionsFunctions;

			const result = await searchUserPools.call(mockContext, '', '');

			const expectedResult: INodeListSearchResult = {
				results: [
					{ name: 'UserPool1', value: 'pool1' },
					{ name: 'UserPool2', value: 'pool2' },
				],
				paginationToken: 'next-token',
			};

			expect(result).toEqual(expectedResult);
			expect(makeAwsRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					url: '',
					method: 'POST',
					headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUserPools' },
					body: expect.stringContaining('MaxResults'),
				}),
			);
		});
	});

	describe('searchGroupsForUser', () => {
		it('should return valid groups that the user is a member of', async () => {
			const mockGroupsResponse = {
				Groups: [
					{ GroupName: 'Group1', UserPoolId: 'user-pool-id' },
					{ GroupName: 'Group2', UserPoolId: 'user-pool-id' },
					{ GroupName: 'Group3', UserPoolId: 'user-pool-id' },
				],
			};

			const mockUsersInGroupResponse = {
				results: [{ Username: 'user1' }],
			};

			(makeAwsRequest as jest.Mock)
				.mockResolvedValueOnce(mockGroupsResponse)
				.mockResolvedValueOnce(mockUsersInGroupResponse);

			const mockContext = {
				getNodeParameter: jest.fn((param) => {
					if (param === 'userPoolId') {
						return { value: 'user-pool-id' };
					}
					if (param === 'userName') {
						return { value: 'user1' };
					}
					return null;
				}),
			} as unknown as ILoadOptionsFunctions;

			const result = await searchGroupsForUser.call(mockContext, '', '');

			const expectedResult: INodeListSearchResult = {
				results: [
					{ name: 'Group1', value: 'group1' },
					{ name: 'Group2', value: 'group2' },
					{ name: 'Group3', value: 'group3' },
				],
				paginationToken: '',
			};

			expect(result).toEqual(expectedResult);
			expect(makeAwsRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					url: '',
					method: 'POST',
					headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
					body: expect.stringContaining('UserPoolId'),
				}),
			);
		});
	});
});
