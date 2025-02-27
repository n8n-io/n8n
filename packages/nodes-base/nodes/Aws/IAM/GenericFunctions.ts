import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	IPollFunctions,
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	IN8nHttpFullResponse,
	JsonObject,
	DeclarativeRestApiSettings,
	IExecutePaginationFunctions,
} from 'n8n-workflow';
import { ApplicationError, NodeApiError } from 'n8n-workflow';

type User = {
	Arn: string;
	CreateDate: number;
	PasswordLastUsed?: number;
	Path?: string;
	PermissionsBoundary?: string;
	Tags: Array<{ Key: string; Value: string }>;
	UserId: string;
	UserName: string;
};

type GetUserResponseBody = {
	GetUserResponse: {
		GetUserResult: {
			User: IDataObject;
		};
	};
};

type GetAllUsersResponseBody = {
	ListUsersResponse: {
		ListUsersResult: {
			Users: IDataObject[];
		};
	};
};

export async function presendStringifyBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	if (requestOptions.body) {
		requestOptions.body = JSON.stringify(requestOptions.body);
	}
	return requestOptions;
}

export async function awsRequest(
	this: ILoadOptionsFunctions | IPollFunctions,
	opts: IHttpRequestOptions,
): Promise<IDataObject> {
	const requestOptions: IHttpRequestOptions = {
		...opts,
		baseURL: 'https://iam.amazonaws.com',
		json: true,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	};

	const errorMapping: Record<number, Record<string, string>> = {
		403: {
			'The security token included in the request is invalid.':
				'The AWS credentials are not valid!',
			'The request signature we calculated does not match the signature you provided':
				'The AWS credentials are not valid!',
		},
	};

	try {
		return (await this.helpers.requestWithAuthentication.call(
			this,
			'aws',
			requestOptions,
		)) as IDataObject;
	} catch (error) {
		const statusCode = (error.statusCode || error.cause?.statusCode) as number;
		let errorMessage = (error.response?.body?.message ||
			error.response?.body?.Message ||
			error.message) as string;

		if (statusCode in errorMapping && errorMessage in errorMapping[statusCode]) {
			throw new ApplicationError(errorMapping[statusCode][errorMessage], {
				level: 'error',
			});
		}

		if (error.cause?.error) {
			try {
				errorMessage = error.cause?.error?.message as string;
			} catch (ex) {
				throw new ApplicationError(
					`Failed to extract error details: ${ex.message || 'Unknown error'}`,
					{ level: 'error' },
				);
			}
		}

		throw new ApplicationError(`AWS error response [${statusCode}]: ${errorMessage}`, {
			level: 'error',
		});
	}
}

export async function fetchAndValidateUserPaths(
	this: ILoadOptionsFunctions,
	prefix: string,
): Promise<void> {
	const opts: IHttpRequestOptions = {
		method: 'POST',
		url: '/?Action=ListUsers&Version=2010-05-08',
	};

	const responseData: IDataObject = await awsRequest.call(this, opts);
	const responseBody = responseData as {
		ListUsersResponse: { ListUsersResult: { Users: IDataObject[] } };
	};

	const users = responseBody.ListUsersResponse.ListUsersResult.Users;

	if (!users || users.length === 0) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'No users found',
				description: 'The user list is empty',
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

		let prefix = additionalFields.PathPrefix as string;

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

			await fetchAndValidateUserPaths.call(this as unknown as ILoadOptionsFunctions, prefix);
		}
	} else if (url.includes('CreateUser')) {
		userName = this.getNodeParameter('userNameNew') as string;
		url += `&UserName=${userName}`;

		if (additionalFields.PermissionsBoundary) {
			const permissionsBoundary = additionalFields.PermissionsBoundary as string;

			const arnPattern = /^arn:aws:iam::\d{12}:policy\/[\w\-+\/=._]+$/;
			if (arnPattern.test(permissionsBoundary)) {
				url += `&PermissionsBoundary=${additionalFields.PermissionsBoundary}`;
			} else {
				const specificError = {
					message: 'Invalid permissions boundary provided',
					description:
						'Permissions boundaries must be provided in ARN format (e.g. arn:aws:iam::123456789012:policy/ExampleBoundaryPolicy)',
				};
				throw new NodeApiError(this.getNode(), {}, specificError);
			}
		}
		if (additionalFields.Path) {
			const path = additionalFields.Path as string;
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
		if (additionalFields.Tags) {
			const additionalTags = additionalFields.Tags as {
				tags: Array<{ key: string; value: string }>;
			};
			const tags = additionalTags.tags;

			let tagString = '';
			tags.forEach((tag, index) => {
				const tagIndex = index + 1;
				tagString += `Tags.member.${tagIndex}.Key=${encodeURIComponent(tag.key)}&Tags.member.${tagIndex}.Value=${encodeURIComponent(tag.value)}&`;
			});
			tagString = tagString.slice(0, -1);

			url += `&${tagString}`;
		}
	} else if (url.includes('User')) {
		const userNameParam = this.getNodeParameter('UserName') as { mode: string; value: string };
		userName = userNameParam.value;
		url += `&UserName=${userName}`;

		if (url.includes('AddUserToGroup') || url.includes('RemoveUserFromGroup')) {
			const groupNameParam = this.getNodeParameter('GroupName') as { mode: string; value: string };
			const groupName = groupNameParam.value;
			url += `&GroupName=${groupName}`;
		}

		if (url.includes('UpdateUser')) {
			const newUserName = this.getNodeParameter('NewUserName');

			if (newUserName) {
				const username = newUserName as string;
				url += `&NewUserName=${username}`;
			}
			if (additionalFields.NewPath) {
				const path = additionalFields.NewPath as string;
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
		groupName = this.getNodeParameter('NewName') as string;
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
		if (additionalFields.Path) {
			url += `&Path=${additionalFields.Path}`;
		}
	} else if (url.includes('GetGroup') || url.includes('DeleteGroup')) {
		const groupNameParam = this.getNodeParameter('GroupName') as { mode: string; value: string };
		groupName = groupNameParam.value;
		url += `&GroupName=${groupName}`;
	} else if (url.includes('UpdateGroup')) {
		const groupNameParam = this.getNodeParameter('GroupName') as { mode: string; value: string };
		const newGroupName = this.getNodeParameter('NewGroupName');

		groupName = groupNameParam.value;
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
		if (typeof additionalFields.NewPath === 'string' && additionalFields.NewPath) {
			const path = additionalFields.NewPath.trim();
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

export async function searchUsersForGroup(
	this: IExecuteSingleFunctions,
	groupName: string,
): Promise<IDataObject[]> {
	if (!groupName) {
		throw new ApplicationError('Group name is required to fetch users.');
	}

	const getGroupOpts: IHttpRequestOptions = {
		method: 'POST',
		url: `/?Action=GetGroup&Version=2010-05-08&GroupName=${groupName}`,
	};

	const responseData: IDataObject = await awsRequest.call(
		this as unknown as ILoadOptionsFunctions,
		getGroupOpts,
	);

	const responseBody = responseData as {
		GetGroupResponse?: {
			GetGroupResult?: {
				Group: IDataObject;
				Users?: IDataObject[];
			};
		};
	};

	const users = responseBody?.GetGroupResponse?.GetGroupResult?.Users ?? [];

	return Array.isArray(users) ? users : [];
}

export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const includeUsers = this.getNodeParameter('includeUsers', 0) as boolean;

	const responseBody = response.body as {
		GetGroupResponse?: { GetGroupResult?: { Group: IDataObject; Users?: IDataObject[] } };
		ListGroupsResponse?: { ListGroupsResult?: { Groups: IDataObject[] } };
	};

	const processedItems: INodeExecutionData[] = [];

	if (responseBody?.GetGroupResponse?.GetGroupResult) {
		const group = responseBody.GetGroupResponse.GetGroupResult.Group;

		if (!includeUsers) {
			return [{ json: group }];
		}

		const users: IDataObject[] = responseBody.GetGroupResponse.GetGroupResult.Users ?? [];
		const groupWithUsers = { ...group, Users: users };
		return [{ json: groupWithUsers }];
	}

	if (responseBody?.ListGroupsResponse?.ListGroupsResult) {
		const groups = responseBody.ListGroupsResponse.ListGroupsResult.Groups ?? [];

		if (!groups.length) {
			return items;
		}

		if (!includeUsers) {
			for (const group of groups) {
				processedItems.push(group as INodeExecutionData);
			}
			return processedItems;
		}

		for (const group of groups) {
			const groupName = group.GroupName as string;
			if (!groupName) continue;

			let users: IDataObject[] = [];
			try {
				users = await searchUsersForGroup.call(this, groupName);
			} catch (error) {
				console.error(`⚠️ Failed to fetch users for group "${groupName}":`, error);
			}

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
): Promise<any> {
	const actionType = this.getNodeParameter('operation');
	let responseBody;
	let data;

	if (!response.body) {
		return [];
	}
	if (actionType === 'get') {
		responseBody = response.body as GetUserResponseBody;
		data = responseBody.GetUserResponse.GetUserResult.User as User;
	} else if (actionType === 'getAll') {
		responseBody = response.body as GetAllUsersResponseBody;
		data = responseBody.ListUsersResponse.ListUsersResult.Users as User[];
	}

	if (!Array.isArray(data)) {
		return [data];
	}

	return data;
}

export async function handlePagination(
	this: IExecutePaginationFunctions,
	resultOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const aggregatedResult: IDataObject[] = [];
	let nextPageToken: string | undefined;
	const returnAll = this.getNodeParameter('returnAll') as boolean;
	let limit = 60;
	if (!returnAll) {
		limit = this.getNodeParameter('limit') as number;
		resultOptions.maxResults = limit;
	}
	resultOptions.paginate = true;

	do {
		if (nextPageToken) {
			const body =
				typeof resultOptions.options.body === 'object' && resultOptions.options.body !== null
					? resultOptions.options.body
					: {};
			resultOptions.options.body = {
				...body,
				PaginationToken: nextPageToken,
			} as IDataObject;
		}

		const responseData = await this.makeRoutingRequest(resultOptions);

		if (responseData && Array.isArray(responseData)) {
			for (const page of responseData) {
				if (page) {
					aggregatedResult.push(page);

					if (!returnAll && aggregatedResult.length >= limit) {
						return aggregatedResult.slice(0, limit).map((item) => ({ json: item }));
					}
				}
			}
		} else if (responseData && typeof responseData === 'object') {
			aggregatedResult.push(responseData as IDataObject);

			nextPageToken =
				((responseData as IDataObject).PaginationToken as string | undefined) || undefined;

			if (!returnAll && aggregatedResult.length >= limit) {
				return aggregatedResult.slice(0, limit).map((item) => ({ json: item }));
			}
		} else {
			nextPageToken = undefined;
		}
	} while (nextPageToken);

	return aggregatedResult.map((item) => ({ json: item }));
}

export async function handleErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const responseBody = response.body as IDataObject;

	if (
		!String(response.statusCode).startsWith('4') &&
		!String(response.statusCode).startsWith('5')
	) {
		return data;
	}
	const error = responseBody.Error as { Code: string; Message: string };
	if (error) {
		const errorCode = error.Code;
		const errorMessage = error.Message;

		let specificError;
		switch (errorCode) {
			case 'EntityAlreadyExists':
				if (errorMessage.includes('user')) {
					specificError = {
						message: 'User already exists',
						description: 'Users must have unique names. Enter a different name for the new user.',
					};
				} else if (errorMessage.includes('group')) {
					console.log('Got here for error in group');
					specificError = {
						message: 'Group already exists',
						description: 'Groups must have unique names. Enter a different name for the new group.',
					};
				}
				break;

			case 'NoSuchEntity':
				if (errorMessage.includes('user')) {
					specificError = {
						message: 'User does not exist',
						description: 'The given user was not found - try entering a different user.',
					};
				} else if (errorMessage.includes('group')) {
					specificError = {
						message: 'Group does not exist',
						description: 'The given group was not found - try entering a different group.',
					};
				}
				break;

			case 'DeleteConflict':
				specificError = {
					message: 'User is in a group',
					description: 'Cannot delete entity, must remove users from group first.',
				};
				break;

			default:
				specificError = {
					message: errorCode || 'Unknown Error',
					description:
						errorMessage || 'An unexpected error occurred. Please check the request and try again.',
				};
				break;
		}

		throw new NodeApiError(this.getNode(), response as unknown as JsonObject, specificError);
	}

	throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
		message: 'Unexpected Error',
		description: 'An unexpected error occurred. Please check the request and try again.',
	});
}

export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const opts: IHttpRequestOptions = {
		method: 'POST',
		url: '/?Action=ListUsers&Version=2010-05-08',
	};

	const responseData: IDataObject = await awsRequest.call(this, opts);

	const responseBody = responseData as {
		ListUsersResponse: { ListUsersResult: { Users: IDataObject[] } };
	};
	const users = responseBody.ListUsersResponse.ListUsersResult.Users;

	if (!users) {
		return { results: [] };
	}

	const results: INodeListSearchItems[] = users
		.map((user) => ({
			name: String(user.UserName),
			value: String(user.UserName),
		}))
		.filter((user) => !filter || user.name.includes(filter))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		results,
	};
}

export async function searchGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const opts: IHttpRequestOptions = {
		method: 'POST',
		url: '/?Action=ListGroups&Version=2010-05-08',
		headers: {
			'Cache-Control': 'no-cache',
			Pragma: 'no-cache',
		},
	};

	const responseData: IDataObject = await awsRequest.call(this, opts);

	const responseBody = responseData as {
		ListGroupsResponse: { ListGroupsResult: { Groups: IDataObject[] } };
	};
	const groups = responseBody.ListGroupsResponse.ListGroupsResult.Groups;

	if (!groups) {
		return { results: [] };
	}

	const results: INodeListSearchItems[] = groups
		.map((group) => ({
			name: String(group.GroupName),
			value: String(group.GroupName),
		}))
		.filter((group) => !filter || group.name.includes(filter))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		results,
	};
}

export async function listGroups(this: ILoadOptionsFunctions): Promise<IDataObject[]> {
	const listGroupsOpts: IHttpRequestOptions = {
		method: 'POST',
		url: '/?Action=ListGroups&Version=2010-05-08',
	};

	const responseData: IDataObject = await awsRequest.call(this, listGroupsOpts);

	const responseBody = responseData as {
		ListGroupsResponse: { ListGroupsResult: { Groups: IDataObject[] } };
	};

	const groups = responseBody.ListGroupsResponse?.ListGroupsResult?.Groups;

	return groups || [];
}

export async function isUserInGroup(
	this: ILoadOptionsFunctions,
	groupName: string,
	userName: string,
): Promise<boolean> {
	const getGroupOpts: IHttpRequestOptions = {
		method: 'POST',
		url: `/?Action=GetGroup&Version=2010-05-08&GroupName=${groupName}`,
	};

	const getGroupResponse: IDataObject = await awsRequest.call(this, getGroupOpts);

	const groupResult = (getGroupResponse as any)?.GetGroupResponse?.GetGroupResult;
	if (!groupResult) {
		return false;
	}

	const usersInGroup = groupResult?.Users as IDataObject[];

	if (!usersInGroup || usersInGroup.length === 0) {
		return false;
	}

	const isUserInThisGroup = usersInGroup?.some((user) => user.UserName === userName);

	return isUserInThisGroup || false;
}

export async function searchGroupsForUser(
	this: ILoadOptionsFunctions,
	filter?: string,
	_paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userNameObj = this.getNodeParameter('UserName') as { mode: string; value: string };
	const userName = userNameObj?.value;

	const groups = await listGroups.call(this);

	if (!groups || groups.length === 0) {
		return { results: [] };
	}

	const groupCheckPromises = groups.map(async (group) => {
		const groupName = group.GroupName as string;

		if (!groupName) {
			return null;
		}

		const isUserInGroupFlag = await isUserInGroup.call(this, groupName, userName);
		if (isUserInGroupFlag) {
			return { name: groupName, value: groupName };
		}

		return null;
	});

	const results = await Promise.all(groupCheckPromises);

	const validUserGroups = results.filter((group) => group !== null) as INodeListSearchItems[];

	const filteredGroups = validUserGroups
		.filter((group) => !filter || group.name.includes(filter))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		results: filteredGroups,
	};
}

export async function removeUserFromGroups(
	this: ILoadOptionsFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const userName = this.getNodeParameter('UserName') as string;
	const userGroups = await searchGroupsForUser.call(this, userName);

	for (const group of userGroups.results) {
		const groupName = group.value;

		const removeUserOpts: IHttpRequestOptions = {
			method: 'POST',
			url: `/?Action=RemoveUserFromGroup&Version=2010-05-08&GroupName=${groupName}&UserName=${userName}`,
		};

		await awsRequest.call(this, removeUserOpts);
	}

	return requestOptions;
}

export async function preDeleteUser(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const userName = this.getNodeParameter('UserName', '') as { mode: string; value: string };

	if (!userName.value) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'User is required',
				description: 'You must provide a valid User to delete.',
			},
		);
	}

	const groupsResult = await searchGroupsForUser.call(this as unknown as ILoadOptionsFunctions);
	const groups = groupsResult.results.map((group) => group.value);

	if (!groups || groups.length === 0) {
		return requestOptions;
	}

	for (const groupName of groups) {
		const removeOpts: IHttpRequestOptions = {
			method: 'POST',
			url: `/?Action=RemoveUserFromGroup&GroupName=${groupName}&UserName=${userName.value}&Version=2010-05-08`,
			ignoreHttpStatusErrors: true,
		};

		await awsRequest.call(this as unknown as ILoadOptionsFunctions, removeOpts);
	}

	return requestOptions;
}

export async function preDeleteGroup(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const groupName = this.getNodeParameter('GroupName', '') as { mode: string; value: string };

	if (!groupName.value) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Group is required',
				description: 'You must provide a valid Group to delete.',
			},
		);
	}

	const users = await searchUsersForGroup.call(this, groupName.value);
	const userNames = users.map((user) => user.UserName as string);

	if (!userNames.length) {
		return requestOptions;
	}

	for (const userName of userNames) {
		const removeUserOpts: IHttpRequestOptions = {
			method: 'POST',
			url: `/?Action=RemoveUserFromGroup&GroupName=${groupName.value}&UserName=${userName}&Version=2010-05-08`,
			ignoreHttpStatusErrors: true,
		};

		try {
			await awsRequest.call(this as unknown as ILoadOptionsFunctions, removeUserOpts);
		} catch (error) {
			console.error(`⚠️ Failed to remove user "${userName}" from "${groupName.value}":`, error);
		}
	}

	return requestOptions;
}
