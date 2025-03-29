import {
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	ApplicationError,
} from 'n8n-workflow';

import type {
	GetAllGroupsResponseBody,
	GetAllUsersResponseBody,
	GetGroupResponseBody,
	GetUserResponseBody,
	User,
} from './types';
import { searchGroupsForUser } from '../methods/listSearch';
import { makeAwsRequest } from '../transport';

//IMPROVED
export async function searchUsersForGroup(
	this: IExecuteSingleFunctions,
	groupName: string,
): Promise<IDataObject[]> {
	if (!groupName) {
		throw new NodeApiError(this.getNode(), {}, { message: 'Group is required to fetch users.' });
	}

	const responseData = (await makeAwsRequest.call(this, {
		method: 'POST',
		url: `/?Action=GetGroup&Version=2010-05-08&GroupName=${groupName}`,
	})) as GetGroupResponseBody;

	const users = responseData?.GetGroupResponse?.GetGroupResult?.Users ?? [];

	return users;
}

//NOT YET
export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const includeUsers = this.getNodeParameter('includeUsers', 0) as boolean;

	const responseBody = response.body as GetGroupResponseBody | GetAllGroupsResponseBody;

	const processedItems: INodeExecutionData[] = [];

	if ('GetGroupResponse' in responseBody) {
		const group = responseBody.GetGroupResponse.GetGroupResult.Group;

		if (!includeUsers) {
			return [{ json: group }];
		}

		const users: IDataObject[] = responseBody.GetGroupResponse.GetGroupResult.Users ?? [];
		const groupWithUsers = { ...group, Users: users };
		return [{ json: groupWithUsers }];
	}

	if ('ListGroupsResponse' in responseBody) {
		const groups = responseBody.ListGroupsResponse.ListGroupsResult.Groups ?? [];

		if (!groups.length) {
			return items;
		}

		if (!includeUsers) {
			for (const group of groups) {
				processedItems.push({ ...group } as INodeExecutionData);
			}
			return processedItems;
		}

		for (const group of groups) {
			const groupName = group.GroupName as string;
			if (!groupName) continue;

			const users = await searchUsersForGroup.call(this, groupName);

			processedItems.push({ ...group, Users: users } as unknown as INodeExecutionData);
		}

		return processedItems;
	}

	return items;
}

export async function processUsersResponse(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const actionType = this.getNodeParameter('operation');
	let responseBody;
	let data;

	if (!response.body) {
		return [];
	}

	if (actionType === 'get') {
		responseBody = response.body as GetUserResponseBody;
		data = responseBody.GetUserResponse?.GetUserResult?.User as User;
	} else if (actionType === 'getAll') {
		responseBody = response.body as GetAllUsersResponseBody;
		data = responseBody.ListUsersResponse?.ListUsersResult?.Users as User[];
	}

	if (!data) {
		return [];
	}

	if (!Array.isArray(data)) {
		return [{ json: data }];
	}

	return data.map((user) => ({ json: user }));
}

export async function fetchAndValidateUserPaths(
	this: ILoadOptionsFunctions | IExecuteSingleFunctions,
	prefix: string,
): Promise<void> {
	const opts: IHttpRequestOptions = {
		method: 'POST',
		url: '/?Action=ListUsers&Version=2010-05-08',
	};

	const responseData: IDataObject = await makeAwsRequest.call(this, opts);
	const responseBody = responseData as GetAllUsersResponseBody;

	const users = responseBody.ListUsersResponse.ListUsersResult.Users;

	if (!users || users.length === 0) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'No users found',
				description: 'No users found in the group. Please try again.',
			},
		);
	}

	const userPaths = users.map((user) => user.Path as string).filter(Boolean);

	const isPathValid = userPaths.some((path) => path.startsWith(prefix));

	if (!isPathValid) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Path does not exist',
				description: `The "${prefix}" path was not found in your users - try entering a different path.`,
			},
		);
	}
}

export async function removeUserFromGroups(
	this: ILoadOptionsFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const userName = (this.getNodeParameter('userName') as IDataObject).value as string;
	const userGroups = await searchGroupsForUser.call(this, userName);

	for (const group of userGroups.results) {
		const groupName = group.value;

		const removeUserOpts: IHttpRequestOptions = {
			method: 'POST',
			url: `/?Action=RemoveUserFromGroup&Version=2010-05-08&GroupName=${groupName}&UserName=${userName}`,
		};

		await makeAwsRequest.call(this, removeUserOpts);
	}

	return requestOptions;
}

export async function preDeleteUser(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const userName = (this.getNodeParameter('userName') as IDataObject).value as string;

	if (!userName) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'User is required',
				description: 'Please provide a value in User field to delete a user.',
			},
		);
	}

	const groupsResult = await searchGroupsForUser.call(this);
	const groups = groupsResult.results.map((group) => group.value);

	if (!groups || groups.length === 0) {
		return requestOptions;
	}

	for (const groupName of groups) {
		const removeOpts: IHttpRequestOptions = {
			method: 'POST',
			url: `/?Action=RemoveUserFromGroup&GroupName=${groupName}&UserName=${userName}&Version=2010-05-08`,
			ignoreHttpStatusErrors: true,
		};

		await makeAwsRequest.call(this as unknown as ILoadOptionsFunctions, removeOpts);
	}

	return requestOptions;
}

export async function preDeleteGroup(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const groupName = (this.getNodeParameter('groupName') as IDataObject).value as string;

	if (!groupName) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Group is required',
				description: 'Please provide a value in Group field to delete a group.',
			},
		);
	}

	const users = await searchUsersForGroup.call(this, groupName);
	const userNames = users.map((user) => user.UserName as string);

	if (!userNames.length) {
		return requestOptions;
	}

	for (const userName of userNames) {
		const removeUserOpts: IHttpRequestOptions = {
			method: 'POST',
			url: `/?Action=RemoveUserFromGroup&GroupName=${groupName}&UserName=${userName}&Version=2010-05-08`,
			ignoreHttpStatusErrors: true,
		};

		try {
			await makeAwsRequest.call(this as unknown as ILoadOptionsFunctions, removeUserOpts);
		} catch (error) {
			console.error(`⚠️ Failed to remove user "${userName}" from "${groupName}":`, error);
		}
	}

	return requestOptions;
}

export async function presendStringifyBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	if (requestOptions.body) {
		requestOptions.body = JSON.stringify(requestOptions.body);
	}
	return requestOptions;
}

export async function presendUserFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;
	let url = requestOptions.url;
	let userName: string;

	if (url.includes('ListUsers')) {
		const returnAll = this.getNodeParameter('returnAll');
		if (!returnAll) {
			const limit = this.getNodeParameter('limit') as number;

			if (!limit) {
				const specificError = {
					message: 'Limit has no value provided',
					description:
						'Please provide value for "Limit" or switch "Return All" to true to get all results',
				};
				throw new NodeApiError(this.getNode(), {}, specificError);
			} else {
				url += `&MaxItems=${limit}`;
			}
		}

		let prefix = additionalFields.pathPrefix;

		if (prefix && typeof prefix === 'string') {
			prefix = prefix.trim();

			if (!prefix.startsWith('/') || !prefix.endsWith('/')) {
				const specificError = {
					message: 'Invalid path',
					description:
						'Ensure the path is structured correctly, e.g. /division_abc/subdivision_xyz/',
				};
				throw new NodeApiError(this.getNode(), {}, specificError);
			}

			url += `&PathPrefix=${encodeURIComponent(prefix)}`;

			await fetchAndValidateUserPaths.call(this, prefix);
		}
	} else if (url.includes('CreateUser')) {
		userName = this.getNodeParameter('userNameNew') as string;
		url += `&UserName=${userName}`;

		if (additionalFields.permissionsBoundary) {
			const permissionsBoundary = additionalFields.permissionsBoundary as string;

			const arnPattern = /^arn:aws:iam::\d{12}:policy\/[\w\-+\/=._]+$/;
			if (arnPattern.test(permissionsBoundary)) {
				url += `&PermissionsBoundary=${permissionsBoundary}`;
			} else {
				const specificError = {
					message: 'Invalid permissions boundary provided',
					description:
						'Permissions boundaries must be provided in ARN format (e.g. arn:aws:iam::123456789012:policy/ExampleBoundaryPolicy)',
				};
				throw new NodeApiError(this.getNode(), {}, specificError);
			}
		}
		if (additionalFields.path) {
			const path = additionalFields.path as string;
			if (!path.startsWith('/') || !path.endsWith('/')) {
				const specificError = {
					message: 'Invalid path format',
					description:
						'Ensure the path is structured correctly, e.g. /division_abc/subdivision_xyz/',
				};
				throw new NodeApiError(this.getNode(), {}, specificError);
			}
			url += `&Path=${path}`;
		}
		if (additionalFields.tags) {
			const additionalTags = additionalFields.tags as IDataObject;

			const tags = Array.isArray(additionalTags.tags) ? additionalTags.tags : [];

			if (tags.length > 0) {
				let tagString = '';
				tags.forEach((tag, index) => {
					const tagIndex = index + 1;
					tagString += `Tags.member.${tagIndex}.Key=${encodeURIComponent(tag.key)}&Tags.member.${tagIndex}.Value=${encodeURIComponent(tag.value)}&`;
				});

				tagString = tagString.slice(0, -1);

				url += `&${tagString}`;
			}
		}
	} else if (url.includes('User')) {
		userName = (this.getNodeParameter('userName') as IDataObject).value as string;
		url += `&UserName=${userName}`;

		if (url.includes('AddUserToGroup') || url.includes('RemoveUserFromGroup')) {
			const groupName = (this.getNodeParameter('groupName') as IDataObject).value as string;
			url += `&GroupName=${groupName}`;
		}

		if (url.includes('UpdateUser')) {
			const newUserName = this.getNodeParameter('newUserName');

			if (newUserName) {
				const username = newUserName as string;
				url += `&NewUserName=${username}`;
			}
			if (additionalFields.newPath) {
				const path = additionalFields.newPath as string;
				if (!path.startsWith('/') || !path.endsWith('/')) {
					const specificError = {
						message: 'Path could not be updated',
						description:
							'Ensure the path is structured correctly, e.g. /division_abc/subdivision_xyz/',
					};
					throw new NodeApiError(this.getNode(), {}, specificError);
				}
				url += `&NewPath=${path}`;
			}
		}
	}
	requestOptions.url = url;
	return requestOptions;
}

export async function presendGroupFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;
	let url = requestOptions.url;
	let groupName: string | undefined;

	if (url.includes('CreateGroup')) {
		groupName = this.getNodeParameter('newName') as string;
		const groupPattern = /^[+=,.@\\-_A-Za-z0-9]+$/;
		if (groupPattern.test(groupName) && groupName.length <= 128) {
			url += `&GroupName=${groupName}`;
		} else {
			const specificError = {
				message: 'Invalid group name provided',
				description:
					"The group name can have up to 128 characters. Valid characters: '+=,.@-_' characters.",
			};
			throw new NodeApiError(this.getNode(), {}, specificError);
		}
		if (additionalFields.path) {
			url += `&Path=${additionalFields.path}`;
		}
	} else if (url.includes('GetGroup') || url.includes('DeleteGroup')) {
		groupName = (this.getNodeParameter('groupName') as IDataObject).value as string;
		url += `&GroupName=${groupName}`;
	} else if (url.includes('UpdateGroup')) {
		groupName = (this.getNodeParameter('groupName') as IDataObject).value as string;
		const newGroupName = this.getNodeParameter('newGroupName');
		if (!/^[a-zA-Z0-9+=,.@_-]+$/.test(groupName) || groupName.length > 128) {
			throw new NodeApiError(
				this.getNode(),
				{},
				{
					message: 'Invalid Group Name',
					description:
						'The group name must be between 1-128 characters and contain only letters, numbers, +=,.@-_',
				},
			);
		}
		url += `&GroupName=${groupName}`;
		if (newGroupName) {
			const name = newGroupName as string;
			if (!/^[a-zA-Z0-9+=,.@_-]+$/.test(name) || name.length > 128) {
				throw new NodeApiError(
					this.getNode(),
					{},
					{
						message: 'Invalid New Name',
						description:
							'The new group name must be between 1-128 characters and contain only letters, numbers, +=,.@-_',
					},
				);
			}
			url += `&NewGroupName=${name}`;
		}
		if (typeof additionalFields.newPath === 'string' && additionalFields.newPath) {
			const path = additionalFields.newPath.trim();
			if (!path.startsWith('/') || !path.endsWith('/')) {
				const specificError = {
					message: 'Invalid path',
					description:
						'Ensure the path is structured correctly, e.g. /division_abc/subdivision_xyz/',
				};
				throw new NodeApiError(this.getNode(), {}, specificError);
			}
			url += `&NewPath=${path}`;
		}
	}

	requestOptions.url = url;
	return requestOptions;
}
