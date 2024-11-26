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

/* Helper function to handle pagination */
const possibleRootProperties = ['Users']; // Root properties that can be returned by the list operations of the API
// ToDo: Test if pagination works
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
			// For different responses the pagination token might differ. ToDo: Ensure this code works for all endpoints.
			resultOptions.options.body = {
				...(resultOptions.options.body as IDataObject),
				PaginationToken: nextPageToken,
			} as IDataObject;
		}

		const responseData = await this.makeRoutingRequest(resultOptions);

		for (const page of responseData) {
			for (const prop of possibleRootProperties) {
				if (page.json[prop]) {
					const currentData = page.json[prop] as IDataObject[];
					aggregatedResult.push(...currentData);
				}
			}

			if (!returnAll && aggregatedResult.length >= limit) {
				return aggregatedResult.slice(0, limit).map((item) => ({ json: item }));
			}

			// For different responses the pagination token might differ. ToDo: Ensure this code works for all endpoints.
			nextPageToken = page.json.PaginationToken as string | undefined;
		}
	} while (nextPageToken);

	return aggregatedResult.map((item) => ({ json: item }));
}

/* Helper functions to handle errors */

// ToDo: Handle errors when something is not found. Answer the questions "what happened?" and "how to fix it?".
export async function handleErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const { resource, operation } = this.getNode().parameters as {
			resource: string;
			operation: string;
		};
		const {
			code: errorCode,
			message: errorMessage,
			details: errorDetails,
		} = (response.body as IDataObject)?.error as {
			code: string;
			message: string;
			innerError?: {
				code: string;
				'request-id'?: string;
				date?: string;
			};
			details?: Array<{
				code: string;
				message: string;
			}>;
		};

		if (errorCode === 'Request_BadRequest' && errorMessage === 'Invalid object identifier') {
			const group = this.getNodeParameter('group.value', '') as string;
			const parameterResource =
				resource === 'group' || errorMessage.includes(group) ? 'group' : 'user';

			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: `The ${parameterResource} ID is invalid`,
				description: 'The ID should be in the format e.g. 02bd9fd6-8f93-4758-87c3-1fb73740a315',
			});
		}
		if (errorCode === 'Request_ResourceNotFound') {
			const group = this.getNodeParameter('group.value', '') as string;
			const parameterResource =
				resource === 'group' || errorMessage.includes(group) ? 'group' : 'user';
			let parameterDisplayName = undefined;
			if (parameterResource === 'group' && operation === 'delete') {
				parameterDisplayName = 'Group to Delete';
			} else if (parameterResource === 'group' && operation === 'get') {
				parameterDisplayName = 'Group to Get';
			} else if (parameterResource === 'group' && operation === 'update') {
				parameterDisplayName = 'Group to Update';
			} else if (parameterResource === 'user' && operation === 'delete') {
				parameterDisplayName = 'User to Delete';
			} else if (parameterResource === 'user' && operation === 'get') {
				parameterDisplayName = 'User to Get';
			} else if (parameterResource === 'user' && operation === 'update') {
				parameterDisplayName = 'User to Update';
			} else if (parameterResource === 'group' && operation === 'addGroup') {
				parameterDisplayName = 'Group';
			} else if (parameterResource === 'user' && operation === 'addGroup') {
				parameterDisplayName = 'User to Add';
			} else if (parameterResource === 'group' && operation === 'removeGroup') {
				parameterDisplayName = 'Group';
			} else if (parameterResource === 'user' && operation === 'removeGroup') {
				parameterDisplayName = 'User to Remove';
			}

			if (parameterDisplayName) {
				throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
					message: `The required ${parameterResource} doesn't match any existing one`,
					description: `Double-check the value in the parameter '${parameterDisplayName}' and try again`,
				});
			}
		}
		if (errorDetails?.some((x) => x.code === 'ObjectConflict' || x.code === 'ConflictingObjects')) {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message: `The ${resource} already exists`,
				description: errorMessage,
			});
		}

		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}

	return data;
}

export async function handleErrorsDeleteUser(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode < 200 || response.statusCode >= 300) {
		const post = this.getNodeParameter('user', undefined) as IDataObject;

		// Provide a user-friendly error message
		if (post && response.statusCode === 404) {
			throw new NodeOperationError(
				this.getNode(),
				'The user you are deleting could not be found. Adjust the "user" parameter setting to delete the post correctly.',
			);
		}

		throw new NodeApiError(this.getNode(), response.body as JsonObject, {
			message: response.statusMessage,
			httpCode: response.statusCode.toString(),
		});
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
		url: '', // the base URL is set in "awsRequest"
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
