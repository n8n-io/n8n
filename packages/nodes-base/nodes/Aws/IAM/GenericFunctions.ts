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
		userName = this.getNodeParameter('UserName') as string;
		url += `&UserName=${userName}`;

		if (additionalFields.PermissionsBoundary) {
			url += `&PermissionsBoundary=${additionalFields.PermissionsBoundary}`;
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
		url += `&GroupName=${groupName}`;

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
	response: IN8nHttpFullResponse,
): Promise<any> {
	const responseBody = response.body as {
		ListGroupsResponse: { ListGroupsResult: { Groups: IDataObject[] } };
	};
	const data = responseBody.ListGroupsResponse.ListGroupsResult.Groups;

	if (!responseBody || !Array.isArray(data)) {
		throw new ApplicationError('Unexpected response format: No groups found.');
	}

	return data;
}

export async function processUsersResponse(
	this: IExecuteSingleFunctions,
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
	if (
		!String(response.statusCode).startsWith('4') &&
		!String(response.statusCode).startsWith('5')
	) {
		return data;
	}

	const resource = (this.getNodeParameter('resource', '') as string) || '';
	const operation = (this.getNodeParameter('operation', '') as string) || '';
	const responseBody = response.body as IDataObject;
	const errorType = (responseBody.__type ?? response.headers?.['x-amzn-errortype']) as
		| string
		| undefined;
	const errorMessage = (responseBody.message ?? response.headers?.['x-amzn-errormessage']) as
		| string
		| undefined;

	interface ErrorDetails {
		message: string;
		description: string;
	}

	type OperationMapping = Record<string, Record<string, ErrorDetails>>;
	type ErrorMapping = Record<string, OperationMapping>;

	const errorMapping: ErrorMapping = {
		group: {
			delete: {
				ResourceNotFoundException: {
					message: "The required group doesn't match any existing one",
					description: "Double-check the value in the parameter 'Group' and try again",
				},
				NoSuchEntity: {
					message: "The required group doesn't match any existing one",
					description: "Double-check the value in the parameter 'Group' and try again",
				},
			},
			create: {
				EntityAlreadyExists: {
					message: 'The group is already created',
					description: "Double-check the value in the parameter 'Group Name' and try again",
				},
				GroupExistsException: {
					message: 'The group is already created',
					description: "Double-check the value in the parameter 'Group Name' and try again",
				},
			},
		},
		user: {
			create: {
				UsernameExistsException: {
					message: 'The user is already created',
					description: "Double-check the value in the parameter 'User Name' and try again",
				},
			},
			delete: {
				UserNotFoundException: {
					message: "The required user doesn't match any existing one",
					description: "Double-check the value in the parameter 'User' and try again",
				},
			},
		},
	};

	if (
		resource in errorMapping &&
		operation in errorMapping[resource] &&
		errorType &&
		errorType in errorMapping[resource][operation]
	) {
		const specificError = errorMapping[resource][operation][errorType];
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject, specificError);
	}

	const genericErrors: Record<string, ErrorDetails> = {
		InvalidParameterException: {
			message: `The ${resource} ID is invalid`,
			description: 'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
		},
		InternalErrorException: {
			message: 'Internal Server Error',
			description: 'Amazon Cognito encountered an internal error. Try again later.',
		},
		TooManyRequestsException: {
			message: 'Too Many Requests',
			description: 'You have exceeded the allowed number of requests. Try again later.',
		},
	};

	if (errorType && errorType in genericErrors) {
		throw new NodeApiError(
			this.getNode(),
			response as unknown as JsonObject,
			genericErrors[errorType],
		);
	}

	throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
		message: errorType || 'Unknown Error',
		description:
			errorMessage || 'An unexpected error occurred. Please check the request and try again.',
	});
}

/* Helper function used in listSearch methods */
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
