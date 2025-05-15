import type { IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	preprocessTags,
	deleteGroupMembers,
	validatePath,
	validateUserPath,
	removeUserFromGroups,
	findUsersForGroup,
	simplifyGetGroupsResponse,
	simplifyGetAllGroupsResponse,
	simplifyGetAllUsersResponse,
	validateName,
	validatePermissionsBoundary,
	encodeBodyAsFormUrlEncoded,
} from '../../helpers/utils';
import { awsApiRequest } from '../../transport';

jest.mock('../../transport', () => ({
	awsApiRequest: jest.fn(),
}));

describe('AWS IAM - Helper Functions', () => {
	let mockNode: any;

	beforeEach(() => {
		mockNode = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(),
			helpers: {
				returnJsonArray: jest.fn((input: unknown[]) => input.map((i) => ({ json: i }))),
			},
		};
	});

	describe('encodeBodyAsFormUrlEncoded', () => {
		it('should encode the body as application/x-www-form-urlencoded', async () => {
			const requestOptions: IHttpRequestOptions = {
				body: {
					client_id: 'myClient',
					client_secret: 'mySecret',
					grant_type: 'client_credentials',
				},
				url: '',
				headers: {},
			};

			const result = await encodeBodyAsFormUrlEncoded.call(mockNode, requestOptions);

			expect(result.body).toBe(
				'client_id=myClient&client_secret=mySecret&grant_type=client_credentials',
			);
		});

		it('should return unchanged options if no body is present', async () => {
			const requestOptions: IHttpRequestOptions = { url: '', headers: {} };
			const result = await encodeBodyAsFormUrlEncoded.call(mockNode, requestOptions);

			expect(result).toEqual({ url: '', headers: {} });
		});
	});

	describe('findUsersForGroup', () => {
		it('should return users for a valid groupName', async () => {
			mockNode.getNodeParameter.mockReturnValue('groupName');
			const mockResponse = {
				GetGroupResponse: { GetGroupResult: { Users: [{ UserName: 'user1' }] } },
			};
			(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await findUsersForGroup.call(mockNode, 'groupName');
			expect(result).toEqual([{ UserName: 'user1' }]);
		});
	});

	describe('preprocessTags', () => {
		it('should preprocess tags correctly into request body', async () => {
			mockNode.getNodeParameter.mockReturnValue({
				tags: [
					{ key: 'Department', value: 'Engineering' },
					{ key: 'Role', value: 'Developer' },
				],
			});

			const requestOptions = { body: '', headers: {}, url: '' };
			const result = await preprocessTags.call(mockNode, requestOptions);

			expect(result.body).toBe(
				'Tags.member.1.Key=Department&Tags.member.1.Value=Engineering&Tags.member.2.Key=Role&Tags.member.2.Value=Developer',
			);
		});

		it('should throw error if a tag is missing a key', async () => {
			mockNode.getNodeParameter.mockReturnValue({
				tags: [{ key: '', value: 'Engineering' }],
			});

			const requestOptions = { body: '', headers: {}, url: '' };

			await expect(preprocessTags.call(mockNode, requestOptions)).rejects.toThrow(
				NodeOperationError,
			);

			await expect(preprocessTags.call(mockNode, requestOptions)).rejects.toThrow(
				"Tag at position 1 is missing 'Key'. Both 'Key' and 'Value' are required.",
			);
		});

		it('should throw error if a tag is missing a value', async () => {
			mockNode.getNodeParameter.mockReturnValue({
				tags: [{ key: 'Department', value: '' }],
			});

			const requestOptions = { body: '', headers: {}, url: '' };

			await expect(preprocessTags.call(mockNode, requestOptions)).rejects.toThrow(
				NodeOperationError,
			);

			await expect(preprocessTags.call(mockNode, requestOptions)).rejects.toThrow(
				"Tag at position 1 is missing 'Value'. Both 'Key' and 'Value' are required.",
			);
		});
	});

	describe('deleteGroupMembers', () => {
		it('should attempt to remove users from a group', async () => {
			mockNode.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'group') {
					return 'groupName';
				}
				return null;
			});

			const mockUsers = [{ UserName: 'user1' }];
			(awsApiRequest as jest.Mock).mockResolvedValue(mockUsers);

			const requestOptions = { headers: {}, url: '' };
			const result = await deleteGroupMembers.call(mockNode, requestOptions);

			expect(result).toEqual(requestOptions);

			expect(awsApiRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('GroupName=groupName'),
				}),
			);
		});
	});

	describe('validatePath', () => {
		it('should throw an error for invalid path length', async () => {
			mockNode.getNodeParameter.mockReturnValue('');
			await expect(validatePath.call(mockNode, { headers: {}, url: '' })).rejects.toThrowError(
				NodeOperationError,
			);
		});

		it('should throw an error for invalid path format', async () => {
			mockNode.getNodeParameter.mockReturnValue('/invalidPath');
			await expect(validatePath.call(mockNode, { url: '' })).rejects.toThrowError(
				NodeOperationError,
			);
		});

		it('should pass for a valid path', async () => {
			mockNode.getNodeParameter.mockReturnValue('/valid/path/');
			const result = await validatePath.call(mockNode, { headers: {}, url: '' });
			expect(result).toEqual({ headers: {}, url: '' });
		});
	});

	describe('validateUserPath', () => {
		it('should throw an error for invalid path prefix', async () => {
			mockNode.getNodeParameter.mockReturnValue('/invalidPrefix');

			const mockResponse = {
				ListUsersResponse: {
					ListUsersResult: {
						Users: [{ UserName: 'user1', Path: '/validPrefix/user1' }],
					},
				},
			};

			(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			await expect(validateUserPath.call(mockNode, { headers: {}, url: '' })).rejects.toThrowError(
				NodeOperationError,
			);
		});

		it('should modify the request body with a valid path', async () => {
			mockNode.getNodeParameter.mockReturnValue('/validPrefix/');
			const requestOptions = { body: {}, headers: {}, url: '' };

			const mockResponse = {
				ListUsersResponse: {
					ListUsersResult: {
						Users: [{ UserName: 'user1', Path: '/validPrefix/user1' }],
					},
				},
			};

			(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await validateUserPath.call(mockNode, requestOptions);
			expect(result.body).toHaveProperty('PathPrefix', '/validPrefix/');
		});
	});

	describe('validateName', () => {
		const requestOptions: IHttpRequestOptions = { body: {}, url: '' };

		it('should throw an error if userName contains spaces', async () => {
			mockNode.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'resource') return 'user';
				if (param === 'userName') return 'John Doe';
				return '';
			});

			await expect(validateName.call(mockNode, requestOptions)).rejects.toThrowError(
				new NodeOperationError(mockNode.getNode(), 'User name should not contain spaces.'),
			);
		});

		it('should throw an error if userName contains invalid characters', async () => {
			mockNode.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'resource') return 'user';
				if (param === 'userName') return 'John@Doe';
				return '';
			});

			await expect(validateName.call(mockNode, requestOptions)).rejects.toThrowError(
				new NodeOperationError(
					mockNode.getNode(),
					'User name can have up to 64 characters. Valid characters: letters, numbers, hyphens (-), and underscores (_).',
				),
			);
		});

		it('should pass validation for valid userName', async () => {
			mockNode.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'resource') return 'user';
				if (param === 'userName') return 'John_Doe123';
				return '';
			});

			await expect(validateName.call(mockNode, requestOptions)).resolves.toEqual(requestOptions);
		});

		it('should throw an error if groupName contains spaces', async () => {
			mockNode.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'resource') return 'group';
				if (param === 'groupName') return 'Group Name';
				return '';
			});

			await expect(validateName.call(mockNode, requestOptions)).rejects.toThrowError(
				new NodeOperationError(mockNode.getNode(), 'Group name should not contain spaces.'),
			);
		});

		it('should throw an error if groupName contains invalid characters', async () => {
			mockNode.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'resource') return 'group';
				if (param === 'groupName') return 'Group@Name';
				return '';
			});

			await expect(validateName.call(mockNode, requestOptions)).rejects.toThrowError(
				new NodeOperationError(
					mockNode.getNode(),
					'Group name can have up to 128 characters. Valid characters: letters, numbers, hyphens (-), and underscores (_).',
				),
			);
		});

		it('should pass validation for valid groupName', async () => {
			mockNode.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'resource') return 'group';
				if (param === 'groupName') return 'Group_Name-123';
				return '';
			});

			await expect(validateName.call(mockNode, requestOptions)).resolves.toEqual(requestOptions);
		});
	});

	describe('validatePermissionsBoundary', () => {
		const requestOptions: IHttpRequestOptions = { body: {}, url: '' };

		it('should return the request options unchanged if no permissions boundary is set', async () => {
			mockNode.getNodeParameter.mockReturnValue(undefined);

			const result = await validatePermissionsBoundary.call(mockNode, requestOptions);

			expect(result).toEqual(requestOptions);
		});

		it('should add a valid permissions boundary to the request body', async () => {
			const validArn = 'arn:aws:iam::123456789012:policy/ExamplePolicy';
			mockNode.getNodeParameter.mockReturnValue(validArn);

			const result = await validatePermissionsBoundary.call(mockNode, requestOptions);

			expect(result.body).toEqual({ PermissionsBoundary: validArn });
		});

		it('should throw an error for invalid permissions boundary format', async () => {
			const invalidArn = 'invalid:arn:format';
			mockNode.getNodeParameter.mockReturnValue(invalidArn);

			await expect(
				validatePermissionsBoundary.call(mockNode, { body: {}, url: '', headers: {} }),
			).rejects.toThrow(NodeOperationError);
		});
	});

	describe('simplifyGetGroupsResponse', () => {
		it('should return group data', async () => {
			mockNode.getNodeParameter.mockReturnValue(false);
			const mockResponse = {
				body: { GetGroupResponse: { GetGroupResult: { Group: { GroupName: 'TestGroup' } } } },
				headers: {},
				url: '',
				statusCode: 200,
			};

			const result = await simplifyGetGroupsResponse.call(mockNode, [], mockResponse);

			expect(result).toEqual([{ json: { GroupName: 'TestGroup' } }]);
		});

		it('should include users if "includeUsers" is true', async () => {
			mockNode.getNodeParameter.mockReturnValue(true);
			const mockResponse = {
				body: {
					GetGroupResponse: {
						GetGroupResult: { Group: { GroupName: 'TestGroup' }, Users: [{ UserName: 'user1' }] },
					},
				},
				headers: {},
				url: '',
				statusCode: 200,
			};

			const result = await simplifyGetGroupsResponse.call(mockNode, [], mockResponse);

			expect(result).toEqual([
				{ json: { GroupName: 'TestGroup', Users: [{ UserName: 'user1' }] } },
			]);
		});
	});

	describe('simplifyGetAllGroupsResponse', () => {
		it('should return groups without users if "includeUsers" is false', async () => {
			mockNode.getNodeParameter.mockReturnValue(false);
			const mockResponse = {
				body: {
					ListGroupsResponse: { ListGroupsResult: { Groups: [{ GroupName: 'TestGroup' }] } },
				},
				headers: {},
				url: '',
				statusCode: 200,
			};

			const result = await simplifyGetAllGroupsResponse.call(mockNode, [], mockResponse);

			expect(result).toEqual([{ json: { GroupName: 'TestGroup' } }]);
		});

		it('should return groups with users if "includeUsers" is true', async () => {
			mockNode.getNodeParameter.mockReturnValue(true);
			const mockResponse = {
				body: {
					ListGroupsResponse: { ListGroupsResult: { Groups: [{ GroupName: 'TestGroup' }] } },
				},
				headers: {},
				url: '',
				statusCode: 200,
			};

			const mockUsers = [{ UserName: 'user1' }];
			(awsApiRequest as jest.Mock).mockResolvedValueOnce({
				GetGroupResponse: { GetGroupResult: { Users: mockUsers } },
			});

			const result = await simplifyGetAllGroupsResponse.call(mockNode, [], mockResponse);

			expect(result).toEqual([{ json: { GroupName: 'TestGroup', Users: mockUsers } }]);
		});
	});

	describe('simplifyGetAllUsersResponse', () => {
		it('should return all users', async () => {
			const mockResponse = {
				body: { ListUsersResponse: { ListUsersResult: { Users: [{ UserName: 'user1' }] } } },
				headers: {},
				url: '',
				statusCode: 200,
			};
			const result = await simplifyGetAllUsersResponse.call(mockNode, [], mockResponse);
			expect(result).toEqual([{ json: { UserName: 'user1' } }]);
		});
	});

	describe('removeUserFromGroups', () => {
		it('should remove a user from all groups', async () => {
			mockNode.getNodeParameter.mockReturnValue('user1');
			const mockUserGroups = { results: [{ value: 'group1' }, { value: 'group2' }] };
			(awsApiRequest as jest.Mock).mockResolvedValue(mockUserGroups);

			const requestOptions = { headers: {}, url: '' };
			const result = await removeUserFromGroups.call(mockNode, requestOptions);

			expect(result).toEqual(requestOptions);
		});
	});
});
