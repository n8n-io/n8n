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

export async function presendFilter(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;
	const filterAttribute = additionalFields.filterAttribute as string;
	let filterType = additionalFields.filterType as string;
	const filterValue = additionalFields.filterValue as string;

	if (filterAttribute && filterType && filterValue) {
		// Convert the filterType to the format the API expects
		const filterTypeMapping: { [key: string]: string } = {
			exactMatch: '=',
			startsWith: '^=',
		};
		filterType = filterTypeMapping[filterType] || filterType;

		// Parse the body if it's a string to add the new property
		let body: IDataObject;
		if (typeof requestOptions.body === 'string') {
			try {
				body = JSON.parse(requestOptions.body) as IDataObject;
			} catch (error) {
				throw new NodeOperationError(this.getNode(), 'Failed to parse requestOptions body');
			}
		} else {
			body = requestOptions.body as IDataObject;
		}

		requestOptions.body = JSON.stringify({
			...body,
			Filter: `${filterAttribute} ${filterType} "${filterValue}"`,
		});

		console.log('requestOptions with filter', requestOptions); // ToDo: Remove
	} else {
		// ToDo: Return warning that all three parameters are needed, don't throw an error but don't send the request
		console.log('no filter is added', requestOptions); // ToDo: Remove
	}

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
	const responseBody = response.body as { Users: IDataObject[] };

	if (!responseBody || !Array.isArray(responseBody.Users)) {
		throw new ApplicationError('Unexpected response format: No users found.');
	}

	const executionData: INodeExecutionData[] = responseBody.Users.map((user) => ({
		json: user,
	}));

	return executionData;
}

/* Helper function to handle pagination */
const possibleRootProperties = ['Attributes'];
// ToDo: Test if pagination works
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
	const region = (await this.getCredentials('aws')).region as string;

	const requestOptions: IHttpRequestOptions = {
		...opts,
		baseURL: `https://cognito-idp.${region}.amazonaws.com`,
		json: true,
		headers: {
			'Content-Type': 'application/x-amz-json-1.1',
			...opts.headers,
		},
	};

	try {
		return (await this.helpers.requestWithAuthentication.call(
			this,
			'aws',
			requestOptions,
		)) as IDataObject;
	} catch (error) {
		// ToDo: Check if this error handling is correct/needed. It is taken from another AWS node.
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
export async function searchUserPools(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const opts: IHttpRequestOptions = {
		url: '', // the base url is set in "awsRequest"
		method: 'POST',
		headers: {
			'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUserPools',
		},
		body: JSON.stringify({
			MaxResults: 60, // the maximum number by documentation is 60
			NextToken: paginationToken ?? undefined,
		}),
	};
	const responseData: IDataObject = await awsRequest.call(this, opts);

	const userPools = responseData.UserPools as Array<{ Name: string; Id: string }>;

	const results: INodeListSearchItems[] = userPools
		.map((a) => ({
			name: a.Name,
			value: a.Id,
		}))
		.filter(
			(a) =>
				!filter ||
				a.name.toLowerCase().includes(filter.toLowerCase()) ||
				a.value.toLowerCase().includes(filter.toLowerCase()),
		)
		.sort((a, b) => {
			if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
			if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
			return 0;
		});

	return { results, paginationToken: responseData.NextToken }; // ToDo: Test if pagination for the search methods works
}

export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// Get the userPoolId from the input
	const userPoolIdRaw = this.getNodeParameter('userPoolId', '') as IDataObject;

	// Extract the actual value
	const userPoolId = userPoolIdRaw.value as string;

	// Ensure that userPoolId is provided
	if (!userPoolId) {
		throw new ApplicationError('User Pool ID is required to search users');
	}

	// Setup the options for the AWS request
	const opts: IHttpRequestOptions = {
		url: '', // the base URL is set in "awsRequest"
		method: 'POST',
		headers: {
			'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers',
		},
		body: JSON.stringify({
			UserPoolId: userPoolId,
			MaxResults: 60,
			NextToken: paginationToken ?? undefined,
		}),
	};

	// Make the AWS request
	const responseData: IDataObject = await awsRequest.call(this, opts);

	// Extract users from the response
	const users = responseData.Users as IDataObject[] | undefined;

	// Handle cases where no users are returned
	if (!users) {
		console.warn('No users found in the response');
		return { results: [] };
	}

	// Map and filter the response data to create results
	const results: INodeListSearchItems[] = users
		.map((user) => {
			// Extract user attributes, if any
			const attributes = user.Attributes as Array<{ Name: string; Value: string }> | undefined;

			// Find the `email` or `sub` attribute, fallback to `Username`
			const email = attributes?.find((attr) => attr.Name === 'email')?.Value;
			const sub = attributes?.find((attr) => attr.Name === 'sub')?.Value;
			const username = user.Username as string;

			// Use email, sub, or Username as the user name and value
			const name = email || sub || username;
			const value = username;

			return { name, value };
		})
		.filter(
			(user) =>
				!filter ||
				user.name.toLowerCase().includes(filter.toLowerCase()) ||
				user.value.toLowerCase().includes(filter.toLowerCase()),
		)
		.sort((a, b) => {
			return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
		});

	// Return the results and the pagination token
	return { results, paginationToken: responseData.NextToken as string | undefined };
}

export async function searchGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// Get the userPoolId from the input
	const userPoolIdRaw = this.getNodeParameter('userPoolId', '') as IDataObject;

	// Extract the actual value
	const userPoolId = userPoolIdRaw.value as string;

	// Ensure that userPoolId is provided
	if (!userPoolId) {
		throw new ApplicationError('User Pool ID is required to search groups');
	}
	// Setup the options for the AWS request
	const opts: IHttpRequestOptions = {
		url: '',
		method: 'POST',
		headers: {
			'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups',
		},
		body: JSON.stringify({
			UserPoolId: userPoolId,
			MaxResults: 60,
			NextToken: paginationToken ?? undefined,
		}),
	};

	const responseData: IDataObject = await awsRequest.call(this, opts);

	const groups = responseData.Groups as Array<{ GroupName?: string }> | undefined;

	// If no groups exist, return an empty list
	if (!groups) {
		return { results: [] };
	}

	// Map and filter the response
	const results: INodeListSearchItems[] = groups
		.filter((group) => group.GroupName)
		.map((group) => ({
			name: group.GroupName as string,
			value: group.GroupName as string,
		}))
		.filter(
			(group) =>
				!filter ||
				group.name.toLowerCase().includes(filter.toLowerCase()) ||
				group.value.toLowerCase().includes(filter.toLowerCase()),
		)
		.sort((a, b) => {
			return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
		});

	return { results, paginationToken: responseData.NextToken };
}
