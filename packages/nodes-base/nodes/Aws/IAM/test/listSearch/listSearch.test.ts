import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchUsers, searchGroups, searchGroupsForUser } from '../../methods/listSearch';
import { awsApiRequest } from '../../transport';

jest.mock('../../transport', () => ({
	awsApiRequest: jest.fn(),
}));

describe('AWS IAM - List search', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	const mockContext = {
		helpers: {
			requestWithAuthentication: jest.fn(),
		},
		getNodeParameter: jest.fn(),
		getCredentials: jest.fn(),
	} as unknown as ILoadOptionsFunctions;

	describe('searchUsers', () => {
		it('should return an empty result if no users are found', async () => {
			const responseData = { ListUsersResponse: { ListUsersResult: { Users: [] } } };
			(awsApiRequest as jest.Mock).mockResolvedValue(responseData);

			const result = await searchUsers.call(mockContext);
			expect(result.results).toEqual([]);
		});

		it('should return formatted user results when users are found', async () => {
			const responseData = {
				ListUsersResponse: {
					ListUsersResult: {
						Users: [{ UserName: 'User1' }, { UserName: 'User2' }],
					},
				},
			};
			(awsApiRequest as jest.Mock).mockResolvedValue(responseData);

			const result = await searchUsers.call(mockContext);
			expect(result.results).toEqual([
				{ name: 'User1', value: 'User1' },
				{ name: 'User2', value: 'User2' },
			]);
		});

		it('should apply filter to the user results', async () => {
			const responseData = {
				ListUsersResponse: {
					ListUsersResult: {
						Users: [{ UserName: 'User1' }, { UserName: 'User2' }],
					},
				},
			};
			(awsApiRequest as jest.Mock).mockResolvedValue(responseData);

			const result = await searchUsers.call(mockContext, 'User1');
			expect(result.results).toEqual([{ name: 'User1', value: 'User1' }]);
		});
	});

	describe('searchGroups', () => {
		it('should return an empty result if no groups are found', async () => {
			const responseData = { ListGroupsResponse: { ListGroupsResult: { Groups: [] } } };
			(awsApiRequest as jest.Mock).mockResolvedValue(responseData);

			const result = await searchGroups.call(mockContext);
			expect(result.results).toEqual([]);
		});

		it('should return formatted group results when groups are found', async () => {
			const responseData = {
				ListGroupsResponse: {
					ListGroupsResult: {
						Groups: [{ GroupName: 'Group1' }, { GroupName: 'Group2' }],
					},
				},
			};
			(awsApiRequest as jest.Mock).mockResolvedValue(responseData);

			const result = await searchGroups.call(mockContext);
			expect(result.results).toEqual([
				{ name: 'Group1', value: 'Group1' },
				{ name: 'Group2', value: 'Group2' },
			]);
		});

		it('should apply filter to the group results', async () => {
			const responseData = {
				ListGroupsResponse: {
					ListGroupsResult: {
						Groups: [{ GroupName: 'Group1' }, { GroupName: 'Group2' }],
					},
				},
			};
			(awsApiRequest as jest.Mock).mockResolvedValue(responseData);

			const result = await searchGroups.call(mockContext, 'Group1');
			expect(result.results).toEqual([{ name: 'Group1', value: 'Group1' }]);
		});
	});

	describe('searchGroupsForUser', () => {
		it('should return empty if no user groups are found', async () => {
			mockContext.getNodeParameter = jest.fn().mockReturnValue('user1');

			const responseData = {
				ListGroupsResponse: { ListGroupsResult: { Groups: [] } },
			};
			(awsApiRequest as jest.Mock).mockResolvedValue(responseData);

			const result = await searchGroupsForUser.call(mockContext);

			expect(result.results).toEqual([]);
		});
	});
});
