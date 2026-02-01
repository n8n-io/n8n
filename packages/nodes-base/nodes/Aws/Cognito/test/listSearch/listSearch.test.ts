import {
	ApplicationError,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
} from 'n8n-workflow';

import type { IUserPool } from '../../helpers/interfaces';
import {
	searchUsers,
	searchGroups,
	searchUserPools,
	searchGroupsForUser,
} from '../../methods/listSearch';
import { awsApiRequest, awsApiRequestAllItems } from '../../transport/index';

jest.mock('../../transport/index', () => ({
	awsApiRequest: jest.fn(),
	awsApiRequestAllItems: jest.fn(),
}));

describe('AWS Cognito Functions', () => {
	describe('searchUsers', () => {
		it('should return user results when users are found', async () => {
			const mockDescribeUserPoolResponse = {
				UserPool: {
					UsernameAttributes: ['email'],
				},
			};

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

			(awsApiRequest as jest.Mock)
				.mockResolvedValueOnce(mockDescribeUserPoolResponse)
				.mockResolvedValueOnce(mockResponse);

			const mockContext = {
				getNodeParameter: jest.fn((param) => {
					if (param === 'userPool') {
						return 'user-pool-id';
					}
					return null;
				}),
			} as unknown as ILoadOptionsFunctions;

			const result = await searchUsers.call(mockContext, '', '');

			const expectedResult: INodeListSearchResult = {
				results: [
					{ name: 'user1@example.com', value: 'sub1' },
					{ name: 'user2@example.com', value: 'sub2' },
				],
				paginationToken: 'next-token',
			};

			expect(result).toEqual(expectedResult);
			expect(awsApiRequest).toHaveBeenCalledWith(
				'POST',
				'ListUsers',
				expect.stringContaining('UserPoolId'),
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
					if (param === 'userPool') {
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
				'POST',
				'ListGroups',
				expect.stringContaining('UserPoolId'),
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
					if (param === 'userPool') {
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
				'POST',
				'ListUserPools',
				expect.stringContaining('Limit'),
			);
		});
	});

	describe('searchGroupsForUser', () => {
		const userName = '03a438f2-10d1-70f1-f45a-09753ab5c4c3';
		const userPoolId = 'eu-central-1_KkXQgdCJv';

		const mockContext = {
			getNodeParameter: jest.fn((param) => {
				if (param === 'user') return userName;
				if (param === 'userPool') return userPoolId;
				return null;
			}),
			getNode: jest.fn(() => ({
				name: 'mockNode',
			})),
		} as unknown as ILoadOptionsFunctions;

		beforeEach(() => {
			(awsApiRequest as jest.Mock).mockResolvedValueOnce({
				UserPool: {
					Id: userPoolId,
					UsernameAttributes: ['email', 'phone_number'],
				},
			} as { UserPool: IUserPool });
		});

		it('should handle empty groups response', async () => {
			(awsApiRequestAllItems as jest.Mock).mockResolvedValueOnce([]);

			const result = await searchGroupsForUser.call(mockContext, '');

			const expectedResult: INodeListSearchResult = {
				results: [],
			};

			expect(result).toEqual(expectedResult);
		});

		it('should return filtered and sorted group list', async () => {
			const mockGroups = [
				{ GroupName: 'Developers' },
				{ GroupName: 'Admins' },
				{ GroupName: 'Guests' },
			];

			(awsApiRequestAllItems as jest.Mock).mockResolvedValueOnce(mockGroups);

			const result = await searchGroupsForUser.call(mockContext, 'dev');

			expect(result).toEqual({
				results: [{ name: 'Developers', value: 'Developers' }],
			});
		});

		it('should return all groups when no filter is passed', async () => {
			const mockGroups = [{ GroupName: 'Zeta' }, { GroupName: 'Alpha' }, { GroupName: 'Beta' }];

			(awsApiRequestAllItems as jest.Mock).mockResolvedValueOnce(mockGroups);

			const result = await searchGroupsForUser.call(mockContext);

			expect(result).toEqual({
				results: [
					{ name: 'Alpha', value: 'Alpha' },
					{ name: 'Beta', value: 'Beta' },
					{ name: 'Zeta', value: 'Zeta' },
				],
			});
		});
	});
});
