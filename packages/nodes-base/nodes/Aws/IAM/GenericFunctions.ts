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
import { ApplicationError, NodeApiError, NodeOperationError } from 'n8n-workflow';

export async function presendTest(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	console.log('requestOptions', requestOptions);
	return requestOptions;
}

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

export async function presendFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	let userName: string;
	let groupName: string | undefined;

	const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;
	const options = this.getNodeParameter('options', {}) as IDataObject;

	let url = requestOptions.url;

	// Logic for user operations
	if (url.includes('ListUsers')) {
		const prefix = additionalFields.PathPrefix;
		if (prefix) url += `&PathPrefix=${prefix}`;
	} else if (url.includes('CreateUser')) {
		userName = this.getNodeParameter('UserName') as string;
		url += `&UserName=${userName}`;
		if (options.PermissionsBoundary) {
			url += `&PermissionsBoundary=${options.PermissionsBoundary}`;
		}
		if (options.Path) {
			url += `&Path=${options.Path}`;
		}
		if (options.Tags) {
			const additionalTags = options.Tags as { tags: Array<{ key: string; value: string }> };
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
		// Logic for other user-related operations like AddUserToGroup, RemoveUserFromGroup, etc.
		const userNameParam = this.getNodeParameter('UserName') as { mode: string; value: string };
		userName = userNameParam.value;
		url += `&UserName=${userName}`;

		if (url.includes('AddUserToGroup') || url.includes('RemoveUserFromGroup')) {
			const groupNameParam = this.getNodeParameter('GroupName') as { mode: string; value: string };
			groupName = groupNameParam.value;
			url += `&GroupName=${groupName}`;
		}
		if (url.includes('UpdateUser')) {
			const hasOptions = options.NewUserName || options.NewPath;

			if (!hasOptions) {
				throw new NodeOperationError(
					this.getNode(),
					'At least one of the options (NewUserName or NewPath) must be provided to update the user.',
				);
			}

			if (options.NewUserName) {
				url += `&NewUserName=${options.NewUserName}`;
			}
			if (options.NewPath) {
				url += `&NewPath=${options.NewPath}`;
			}
		}
	}

	// Logic for group operations (Create, Update, etc.)
	if (url.includes('CreateGroup')) {
		groupName = this.getNodeParameter('GroupName') as string;
		console.log(groupName);
		url += `&GroupName=${groupName}`;

		if (options.Path) {
			url += `&Path=${options.Path}`;
		}
	} else if (url.includes('GetGroup') || url.includes('DeleteGroup')) {
		const groupNameParam = this.getNodeParameter('GroupName') as { mode: string; value: string };
		groupName = groupNameParam.value;
		url += `&GroupName=${groupName}`;
	} else if (url.includes('UpdateGroup')) {
		const groupNameParam = this.getNodeParameter('GroupName') as { mode: string; value: string };
		groupName = groupNameParam.value;
		url += `&GroupName=${groupName}`;
		const hasOptions = options.NewGroupName || options.NewPath;

		if (!hasOptions) {
			throw new NodeOperationError(
				this.getNode(),
				'At least one of the options (NewGroupName or Path) must be provided to update the group.',
			);
		}

		if (options.NewGroupName) {
			url += `&NewGroupName=${options.NewGroupName}`;
		}
		if (options.NewPath) {
			url += `&NewPath=${options.NewPath}`;
		}
	}
	requestOptions.url = url;
	return requestOptions;
}

/* Helper function to process Group/User Response */
export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const responseBody = response.body as {
		ListGroupsResponse: { ListGroupsResult: { Groups: IDataObject[] } };
	};
	const data = responseBody.ListGroupsResponse.ListGroupsResult.Groups;

	if (!responseBody || !Array.isArray(data)) {
		throw new ApplicationError('Unexpected response format: No groups found.');
	}

	const executionData: INodeExecutionData[] = data.map((group) => ({
		json: group,
	}));

	return executionData;
}

export async function processUsersResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const responseBody = response.body as {
		ListUsersResponse: { ListUsersResult: { Users: IDataObject[] } };
	};
	const data = responseBody.ListUsersResponse.ListUsersResult.Users;

	if (!responseBody || !Array.isArray(data)) {
		throw new ApplicationError('Unexpected response format: No users found.');
	}

	const executionData: INodeExecutionData[] = data.map((user) => ({
		json: user,
	}));

	return executionData;
}

export async function handlePagination(
	this: IExecutePaginationFunctions,
	resultOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const aggregatedResult: IDataObject[] = [];
	let nextPageToken: string | undefined;
	const returnAll = this.getNodeParameter('returnAll') as boolean;
	let limit = 60;
	// Update limit if 'returnAll' is not selected
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
				aggregatedResult.push(page.json);

				if (!returnAll && aggregatedResult.length >= limit) {
					return aggregatedResult.slice(0, limit).map((item) => ({ json: item }));
				}

				nextPageToken = page.json.PaginationToken as string | undefined;
			}
		} else if (responseData && typeof responseData === 'object') {
			aggregatedResult.push(responseData as IDataObject);

			nextPageToken = (responseData as IDataObject).PaginationToken as string | undefined;

			if (!returnAll && aggregatedResult.length >= limit) {
				return aggregatedResult.slice(0, limit).map((item) => ({ json: item }));
			}
		}
	} while (nextPageToken);

	return aggregatedResult.map((item) => ({ json: item }));
}

/* Helper functions to handle errors */
export async function handleErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const resource = this.getNodeParameter('resource') as string;
		const operation = this.getNodeParameter('operation') as string;
		const responseBody = response.body as IDataObject;
		const errorType = responseBody.__type ?? response.headers?.['x-amzn-errortype'];
		const errorMessage = responseBody.message ?? response.headers?.['x-amzn-errormessage'];

		// Resource/Operation specific errors
		if (resource === 'group') {
			if (operation === 'delete') {
				if (errorType === 'ResourceNotFoundException' || errorType === 'NoSuchEntity') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required group doesn't match any existing one",
						description: "Double-check the value in the parameter 'Group' and try again",
					});
				}
			} else if (operation === 'get') {
				if (errorType === 'ResourceNotFoundException' || errorType === 'NoSuchEntity') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required group doesn't match any existing one",
						description: "Double-check the value in the parameter 'Group' and try again",
					});
				}
			} else if (operation === 'update') {
				if (errorType === 'ResourceNotFoundException' || errorType === 'NoSuchEntity') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required group doesn't match any existing one",
						description: "Double-check the value in the parameter 'Group' and try again",
					});
				}
			} else if (operation === 'create') {
				if (errorType === 'EntityAlreadyExists' || errorType === 'GroupExistsException') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The group is already created',
						description: "Double-check the value in the parameter 'Group Name' and try again",
					});
				}
			}
		} else if (resource === 'user') {
			if (operation === 'create') {
				if (
					errorType === 'UsernameExistsException' &&
					errorMessage === 'User account already exists'
				) {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The user is already created',
						description: "Double-check the value in the parameter 'User Name' and try again",
					});
				}
			} else if (operation === 'addToGroup') {
				// Group or user doesn't exist
				if (errorType === 'UserNotFoundException') {
					const user = this.getNodeParameter('user.value', '') as string;

					if (typeof errorMessage === 'string' && errorMessage.includes(user)) {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: "The required user doesn't match any existing one",
							description: "Double-check the value in the parameter 'User' and try again.",
						});
					}
				} else if (errorType === 'ResourceNotFoundException') {
					const group = this.getNodeParameter('group.value', '') as string;

					if (typeof errorMessage === 'string' && errorMessage.includes(group)) {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: "The required group doesn't match any existing one",
							description: "Double-check the value in the parameter 'Group' and try again.",
						});
					}
				}
			} else if (operation === 'delete') {
				if (errorType === 'UserNotFoundException') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required user doesn't match any existing one",
						description: "Double-check the value in the parameter 'User' and try again",
					});
				}
			} else if (operation === 'get') {
				if (errorType === 'UserNotFoundException') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required user doesn't match any existing one",
						description: "Double-check the value in the parameter 'User' and try again",
					});
				}
			} else if (operation === 'removeFromGroup') {
				// Group or user doesn't exist
				if (errorType === 'UserNotFoundException') {
					const user = this.getNodeParameter('user.value', '') as string;

					if (typeof errorMessage === 'string' && errorMessage.includes(user)) {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: "The required user doesn't match any existing one",
							description: "Double-check the value in the parameter 'User' and try again.",
						});
					}
				} else if (errorType === 'ResourceNotFoundException') {
					const group = this.getNodeParameter('group.value', '') as string;

					if (typeof errorMessage === 'string' && errorMessage.includes(group)) {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: "The required group doesn't match any existing one",
							description: "Double-check the value in the parameter 'Group' and try again.",
						});
					}
				}
			} else if (operation === 'update') {
				if (errorType === 'UserNotFoundException') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "The required user doesn't match any existing one",
						description: "Double-check the value in the parameter 'User' and try again",
					});
				}
			}
		}

		// Generic Error Handling
		if (errorType === 'InvalidParameterException') {
			const group = this.getNodeParameter('group.value', '') as string;
			const parameterResource =
				resource === 'group' || (typeof errorMessage === 'string' && errorMessage.includes(group))
					? 'group'
					: 'user';

			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: `The ${parameterResource} ID is invalid`,
				description: 'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
			});
		}

		if (errorType === 'InternalErrorException') {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: 'Internal Server Error',
				description: 'Amazon Cognito encountered an internal error. Try again later.',
			});
		}

		if (errorType === 'TooManyRequestsException') {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: 'Too Many Requests',
				description: 'You have exceeded the allowed number of requests. Try again later.',
			});
		}

		if (errorType === 'NotAuthorizedException') {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: 'Unauthorized Access',
				description:
					'You are not authorized to perform this operation. Check your permissions and try again.',
			});
		}

		if (errorType === 'ServiceFailure') {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: 'Service Failure',
				description:
					'The request processing has failed because of an unknown error, exception, or failure. Try again later.',
			});
		}

		if (errorType === 'LimitExceeded') {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: 'Limit Exceeded',
				description:
					'The request was rejected because it attempted to create resources beyond the current AWS account limits. Check your AWS limits and try again.',
			});
		}
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}

	return data;
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

		if (statusCode === 403) {
			if (errorMessage === 'The security token included in the request is invalid.') {
				throw new ApplicationError('The AWS credentials are not valid!', { level: 'warning' });
			} else if (
				errorMessage.startsWith(
					'The request signature we calculated does not match the signature you provided',
				)
			) {
				throw new ApplicationError('The AWS credentials are not valid!', { level: 'warning' });
			}
		}

		if (error.cause?.error) {
			try {
				errorMessage = error.cause?.error?.message as string;
			} catch (ex) {}
		}

		throw new ApplicationError(`AWS error response [${statusCode}]: ${errorMessage}`, {
			level: 'warning',
		});
	}
}

/* listSearch methods */
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
		console.warn('No users found in the response');
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
		console.warn('No groups found in the response');
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
