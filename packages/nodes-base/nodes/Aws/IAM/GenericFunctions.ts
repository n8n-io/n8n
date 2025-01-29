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

/*
 * Helper function which stringifies the body before sending the request.
 * It is added to the routing property in the "resource" parameter thus for all requests.
 */
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
		const prefix = additionalFields.PathPrefix;
		if (prefix) url += `&PathPrefix=${prefix}`;
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
			url += `&Path=${additionalFields.Path}`;
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
			if (additionalFields.NewUserName) {
				url += `&NewUserName=${additionalFields.NewUserName}`;
			}
			if (additionalFields.NewPath) {
				url += `&NewPath=${additionalFields.NewPath}`;
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
		groupName = this.getNodeParameter('GroupName') as string;
		const groupPattern = /^[+=,.@\\-_A-Za-z0-9]+$/;
		if (groupPattern.test(groupName)) {
			url += `&GroupName=${groupName}`;
		} else {
			const specificError = {
				message: 'Invalid group name provided',
				description: "The group name not contain spaces. Valid characters: '+=,.@-_' characters.",
			};
			throw new NodeApiError(this.getNode(), {}, specificError);
		}
		// url += `&GroupName=${groupName}`;

		if (additionalFields.Path) {
			url += `&Path=${additionalFields.Path}`;
		}
	} else if (url.includes('GetGroup') || url.includes('DeleteGroup')) {
		const groupNameParam = this.getNodeParameter('GroupName') as { mode: string; value: string };
		groupName = groupNameParam.value;
		url += `&GroupName=${groupName}`;
	} else if (url.includes('UpdateGroup')) {
		const groupNameParam = this.getNodeParameter('GroupName') as { mode: string; value: string };
		groupName = groupNameParam.value;
		url += `&GroupName=${groupName}`;

		if (additionalFields.NewGroupName) {
			url += `&NewGroupName=${additionalFields.NewGroupName}`;
		}
		if (additionalFields.NewPath) {
			url += `&NewPath=${additionalFields.NewPath}`;
		}
	}

	requestOptions.url = url;
	return requestOptions;
}

export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<any> {
	const responseBody = response.body as {
		ListGroupsResponse: { ListGroupsResult: { Groups: IDataObject[] } };
	};
	const data = responseBody.ListGroupsResponse.ListGroupsResult.Groups;

	if (!responseBody || !Array.isArray(data)) {
		return [];
	}

	return data;
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
				specificError = {
					message: 'User name already exists',
					description:
						'The given user name already exists - try entering a unique name for the user.',
				};
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

export async function simplifyData(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<any> {
	const simple = this.getNodeParameter('simple') as boolean;

	if (!simple) {
		return items;
	}

	const processedUsers: User[] = [];
	items.map((item) => {
		const isNested =
			item.json && typeof item.json === 'object' && Object.keys(item.json).length > 0;
		const user = isNested ? (item.json as User) : (item as unknown as User);

		processedUsers.push({
			Arn: user.Arn,
			CreateDate: user.CreateDate,
			Tags: user.Tags ? user.Tags.slice(0, 6) : user.Tags,
			UserId: user.UserId,
			UserName: user.UserName,
		});
	});
	return processedUsers;
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

//WIP
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

		console.log(`Removing user ${userName} from group ${groupName}...`);
		await awsRequest.call(this, removeUserOpts);
	}

	return requestOptions;
}
