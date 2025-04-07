import { NodeApiError } from 'n8n-workflow';

import {
	searchUsersForGroup,
	presendStringifyBody,
	processGroupsResponse,
	processUsersResponse,
	deleteGroupMembers,
	validatePath,
	validateLimit,
	validateUserPath,
	removeUserFromGroups,
} from '../../helpers/utils';
import { makeAwsRequest } from '../../transport';

jest.mock('../../transport', () => ({
	makeAwsRequest: jest.fn(),
}));

describe('AWS IAM - Helper Functions', () => {
	let mockNode: any;

	beforeEach(() => {
		mockNode = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(),
		};
	});

	describe('presendStringifyBody', () => {
		it('should stringify the body if it exists', async () => {
			const requestOptions = { body: { key: 'value' }, headers: {}, url: '' };
			const result = await presendStringifyBody.call(mockNode, requestOptions);
			expect(result.body).toBe('{"key":"value"}');
		});

		it('should not modify the body if it does not exist', async () => {
			const requestOptions = { headers: {}, url: '' };
			const result = await presendStringifyBody.call(mockNode, requestOptions);
			expect(result.body).toBeUndefined();
		});
	});

	describe('searchUsersForGroup', () => {
		it('should throw an error if no groupName is provided', async () => {
			mockNode.getNodeParameter.mockReturnValue(undefined);
			await expect(searchUsersForGroup.call(mockNode, '')).rejects.toThrowError(NodeApiError);
		});

		it('should return users for a valid groupName', async () => {
			mockNode.getNodeParameter.mockReturnValue('groupName');
			const mockResponse = {
				GetGroupResponse: { GetGroupResult: { Users: [{ UserName: 'user1' }] } },
			};
			(makeAwsRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await searchUsersForGroup.call(mockNode, 'groupName');
			expect(result).toEqual([{ UserName: 'user1' }]);
		});
	});

	describe('processGroupsResponse', () => {
		it('should return the group if includeUsers is false', async () => {
			mockNode.getNodeParameter.mockReturnValue(false);
			const response = {
				ListGroupsResponse: { ListGroupsResult: { Groups: [{ GroupName: 'group1' }] } },
			};
			const result = await processGroupsResponse.call(mockNode, [], { body: response });
			expect(result).toEqual([{ json: { GroupName: 'group1' } }]);
		});

		it('should return the group with users if includeUsers is true', async () => {
			mockNode.getNodeParameter.mockReturnValue(true);
			const response = {
				ListGroupsResponse: { ListGroupsResult: { Groups: [{ GroupName: 'group1' }] } },
			};
			const mockUsers = [{ UserName: 'user1' }];
			(makeAwsRequest as jest.Mock).mockResolvedValue({
				GetGroupResponse: { GetGroupResult: { Users: mockUsers } },
			});

			const result = await processGroupsResponse.call(mockNode, [], { body: response });
			expect(result).toEqual([{ json: { GroupName: 'group1', Users: mockUsers } }]);
		});
	});

	describe('processUsersResponse', () => {
		it('should return user data for "get" operation', async () => {
			mockNode.getNodeParameter.mockReturnValue('get');
			const response = { GetUserResponse: { GetUserResult: { User: { UserName: 'user1' } } } };

			const result = await processUsersResponse.call(mockNode, [], { body: response });
			expect(result).toEqual([{ json: { UserName: 'user1' } }]);
		});

		it('should return a list of users for "getAll" operation', async () => {
			mockNode.getNodeParameter.mockReturnValue('getAll');
			const response = {
				ListUsersResponse: { ListUsersResult: { Users: [{ UserName: 'user1' }] } },
			};

			const result = await processUsersResponse.call(mockNode, [], { body: response });
			expect(result).toEqual([{ json: { UserName: 'user1' } }]);
		});
	});

	describe('deleteGroupMembers', () => {
		it('should throw an error if no group is provided', async () => {
			mockNode.getNodeParameter.mockReturnValue(undefined);
			await expect(
				deleteGroupMembers.call(mockNode, { headers: {}, url: '' }),
			).rejects.toThrowError(NodeApiError);
		});

		it('should attempt to remove users from a group', async () => {
			mockNode.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'group') {
					return { value: 'groupName' };
				}
				return null;
			});

			const mockUsers = [{ UserName: 'user1' }];
			(makeAwsRequest as jest.Mock).mockResolvedValue(mockUsers);

			const requestOptions = { headers: {}, url: '' };
			const result = await deleteGroupMembers.call(mockNode, requestOptions);

			expect(result).toEqual(requestOptions);

			expect(makeAwsRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: expect.stringContaining('GroupName=groupName'),
				}),
			);
		});
	});

	describe('validatePath', () => {
		it('should throw an error for invalid path length', async () => {
			mockNode.getNodeParameter.mockReturnValue('');
			await expect(validatePath.call(mockNode, {})).rejects.toThrowError(NodeApiError);
		});

		it('should throw an error for invalid path format', async () => {
			mockNode.getNodeParameter.mockReturnValue('/invalidPath');
			await expect(validatePath.call(mockNode, {})).rejects.toThrowError(NodeApiError);
		});
	});

	describe('validateLimit', () => {
		it('should throw an error if limit is not provided and returnAll is false', async () => {
			mockNode.getNodeParameter.mockReturnValue(false);
			mockNode.getNodeParameter.mockReturnValueOnce(undefined);

			await expect(validateLimit.call(mockNode, { headers: {}, url: '' })).rejects.toThrowError(
				NodeApiError,
			);
		});

		it('should modify requestOptions if limit is provided', async () => {
			mockNode.getNodeParameter.mockReturnValueOnce(false).mockReturnValueOnce(10);

			const requestOptions = { url: '/some-url' };
			const result = await validateLimit.call(mockNode, requestOptions);
			expect(result.url).toContain('MaxItems=10');
		});
	});

	describe('validateUserPath', () => {
		it('should throw an error for invalid path prefix', async () => {
			mockNode.getNodeParameter.mockReturnValue('/invalidPrefix');
			await expect(validateUserPath.call(mockNode, { headers: {}, url: '' })).rejects.toThrowError(
				NodeApiError,
			);
		});
	});

	describe('removeUserFromGroups', () => {
		it('should remove user from all groups', async () => {
			mockNode.getNodeParameter.mockReturnValue('user1');
			const mockUserGroups = { results: [{ value: 'group1' }, { value: 'group2' }] };
			(makeAwsRequest as jest.Mock).mockResolvedValue(mockUserGroups);

			const requestOptions = { headers: {}, url: '' };
			const result = await removeUserFromGroups.call(mockNode, requestOptions);
			expect(result).toEqual(requestOptions);
		});
	});
});
