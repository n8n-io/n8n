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

/* Function which helps while developing the node */
// ToDo: Remove before completing the pull request
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
	let pathPrefix: string | undefined;

	const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;

	let url = requestOptions.url;

	if (url.includes('CreateUser')) {
		userName = this.getNodeParameter('UserName') as string;
		if (additionalFields.PermissionsBoundary) {
			url += `&PermissionsBoundary=${additionalFields.PermissionsBoundary}`;
		}
		if (additionalFields.Path) {
			url += `&Path=${additionalFields.Path}`;
		}
		if (additionalFields.Tags) {
			const tags = additionalFields.Tags as Array<{ key: string; value: string }>;

			console.log('Got here', additionalFields.Tags);

			const tagArray = tags.map((tag) => ({
				[tag.key]: tag.value,
			}));

			url += `&Tags=${tagArray}`;
		}
	} else if (url.includes('AddUserToGroup') || url.includes('RemoveUserFromGroup')) {
		const userNameParam = this.getNodeParameter('UserName') as { mode: string; value: string };
		userName = userNameParam.value;

		const groupNameParam = this.getNodeParameter('GroupName') as { mode: string; value: string };
		groupName = groupNameParam.value;
	} else {
		const userNameParam = this.getNodeParameter('UserName') as { mode: string; value: string };
		userName = userNameParam.value;

		if (url.includes('UpdateUser')) {
			if (additionalFields.NewUserName) {
				url += `&NewUserName=${additionalFields.NewUserName}`;
			}
			if (additionalFields.NewPath) {
				url += `&NewPath=${additionalFields.NewPath}`;
			}
		}
	}

	url += `&UserName=${userName}`;

	if (groupName) {
		url += `&GroupName=${groupName}`;
	}

	if (additionalFields.PathPrefix) {
		url += `&PathPrefix=${additionalFields.PathPrefix}`;
	}

	requestOptions.url = url;

	return requestOptions;
}

/* Helper function to process attributes in UserAttributes */
export async function processAttributes(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	let body: Record<string, any>;
	if (typeof requestOptions.body === 'string') {
		try {
			body = JSON.parse(requestOptions.body);
		} catch (error) {
			throw new ApplicationError('Invalid JSON body: Unable to parse.');
		}
	} else if (typeof requestOptions.body === 'object' && requestOptions.body !== null) {
		body = requestOptions.body;
	} else {
		throw new ApplicationError('Invalid request body: Expected a JSON string or object.');
	}

	const attributes = this.getNodeParameter('UserAttributes.attributes', []) as Array<{
		Name: string;
		Value: string;
	}>;

	const processedAttributes = attributes.map((attribute) => ({
		Name: attribute.Name.startsWith('custom:') ? attribute.Name : attribute.Name,
		Value: attribute.Value,
	}));

	body.UserAttributes = processedAttributes;

	requestOptions.body = JSON.stringify(body);

	return requestOptions;
}

/* Helper function to process Group/User Response */
export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const responseBody = response.body as { Groups: IDataObject[] };

	if (!responseBody || !Array.isArray(responseBody.Groups)) {
		throw new ApplicationError('Unexpected response format: No groups found.');
	}

	const executionData: INodeExecutionData[] = responseBody.Groups.map((group) => ({
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

const possibleRootProperties = ['Users', 'Groups'];
// ToDo: Test if pagination works
export async function handlePagination(
	this: IExecutePaginationFunctions,
	resultOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const aggregatedResult: IDataObject[] = [];
	let nextPageToken: string | undefined;
	const returnAll = this.getNodeParameter('returnAll') as boolean;
	let limit = 60;
	console.log('Entered pagination!!!!');
	// Update limit if 'returnAll' is not selected
	if (!returnAll) {
		limit = this.getNodeParameter('limit') as number;
		resultOptions.maxResults = limit;
	}
	resultOptions.paginate = true;

	do {
		if (nextPageToken) {
			// Append PaginationToken to the request body
			const body =
				typeof resultOptions.options.body === 'object' && resultOptions.options.body !== null
					? resultOptions.options.body
					: {};
			resultOptions.options.body = {
				...body,
				PaginationToken: nextPageToken,
			} as IDataObject;
			console.log('Updated request body with PaginationToken:', resultOptions.options.body);
		}

		// Make the request
		console.log('Sending request with options:', resultOptions);
		const responseData = await this.makeRoutingRequest(resultOptions);

		// Process response data
		for (const page of responseData) {
			console.log('Processing page:', page.json);

			// Iterate over possible root properties (e.g., "Users")
			for (const prop of possibleRootProperties) {
				if (page.json[prop]) {
					const currentData = page.json[prop] as IDataObject[];
					console.log(`Extracted data from property "${prop}":`, currentData);
					aggregatedResult.push(...currentData);
				}
			}

			// Check if the limit has been reached
			if (!returnAll && aggregatedResult.length >= limit) {
				console.log('Limit reached. Returning results.');
				return aggregatedResult.slice(0, limit).map((item) => ({ json: item }));
			}

			// Update the nextPageToken for the next request
			nextPageToken = page.json.PaginationToken as string | undefined;
			console.log('Next Page Token:', nextPageToken);
		}
	} while (nextPageToken);

	console.log('Final Aggregated Results:', aggregatedResult);
	return aggregatedResult.map((item) => ({ json: item }));
}

export async function validatePath(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const path = this.getNodeParameter('path', '/') as string;

	// Length validation
	if (path.length < 1 || path.length > 512) {
		throw new NodeOperationError(this.getNode(), 'Path must be between 1 and 512 characters.');
	}

	// Regex validation
	if (!/^\/$|^\/[\u0021-\u007E]+\/$/.test(path)) {
		throw new NodeOperationError(
			this.getNode(),
			'Path must begin and end with a forward slash and contain valid ASCII characters.',
		);
	}

	return requestOptions;
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
