import {
	ApplicationError,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
} from 'n8n-workflow';

import { searchUsersForGroup } from '../../helpers/searchFunctions';
import {
	searchUsers,
	searchGroups,
	searchUserPools,
	searchGroupsForUser,
} from '../../methods/listSearch';
import { awsApiRequest } from '../../transport/index';

jest.mock('../../transport/index', () => ({
	awsApiRequest: jest.fn(),
}));

jest.mock('../../helpers/searchFunctions', () => ({
	...jest.requireActual('../../helpers/searchFunctions'),
	searchUsersForGroup: jest.fn(),
}));

describe('AWS Cognito Functions', () => {
	describe('searchUsers', () => {
		it('should return user results when users are found', async () => {
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

			(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

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
			expect(awsApiRequest).toHaveBeenCalledWith(
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
				getNodeParameter: jest.fn().mockReturnValue(''),
				getNode: jest.fn(),
			} as unknown as ILoadOptionsFunctions;

			await expect(searchUsers.call(mockContext)).rejects.toThrow(
				'User Pool ID is required to search users',
			);
		});
	});

	describe('searchGroups', () => {
		it('should return group results when groups are found', async () => {
			const mockResponse = {
				Groups: [
					{ GroupName: 'Group1', UserPoolId: 'user-pool-id' },
					{ GroupName: 'Group2', UserPoolId: 'user-pool-id' },
				],
				NextToken: 'next-token',
			};

			(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

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
					{ name: 'Group1', value: 'Group1' },
					{ name: 'Group2', value: 'Group2' },
				],
				paginationToken: 'next-token',
			};

			expect(result).toEqual(expectedResult);
			expect(awsApiRequest).toHaveBeenCalledWith(
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
				getNode: jest.fn(),
			} as unknown as ILoadOptionsFunctions;

			await expect(searchGroups.call(mockContext)).rejects.toThrow(ApplicationError);
		});
	});

	describe('searchUserPools', () => {
		it('should return user pool results when user pools are found', async () => {
			const mockResponse = {
				UserPools: [
					{ Id: 'pool1', Name: 'User Pool 1' },
					{ Id: 'pool2', Name: 'User Pool 2' },
				],
				NextToken: 'next-token',
			};

			(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

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
			expect(awsApiRequest).toHaveBeenCalledWith(
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
		const userName = '03a438f2-10d1-70f1-f45a-09753ab5c4c3';
		const userPoolId = 'eu-central-1_KkXQgdCJv';

		it('should handle empty groups response', async () => {
			const mockListGroupsResponse = { Groups: [] };

			(awsApiRequest as jest.Mock).mockResolvedValueOnce(mockListGroupsResponse);

			const mockContext = {
				getNodeParameter: jest.fn((param) => {
					if (param === 'userName') return { value: userName };
					if (param === 'userPoolId') return { value: userPoolId };
					return null;
				}),
			} as unknown as ILoadOptionsFunctions;

			const result = await searchGroupsForUser.call(mockContext, '', '');

			const expectedResult: INodeListSearchResult = {
				results: [],
				paginationToken: undefined,
			};

			expect(result).toEqual(expectedResult);
		});

		it('should return empty array when user is not in any groups', async () => {
			const mockListGroupsResponse = {
				Groups: [{ GroupName: 'AdminGroup' }, { GroupName: 'UserGroup' }],
			};

			(awsApiRequest as jest.Mock).mockResolvedValueOnce(mockListGroupsResponse);
			(searchUsersForGroup as jest.Mock).mockResolvedValue({ results: [] });

			const mockContext = {
				getNodeParameter: jest.fn((param) => {
					if (param === 'userName') return { value: userName };
					if (param === 'userPoolId') return { value: userPoolId };
					return null;
				}),
			} as unknown as ILoadOptionsFunctions;

			const result = await searchGroupsForUser.call(mockContext);
			expect(result).toEqual({ results: [], paginationToken: undefined });
		});
	});
});
