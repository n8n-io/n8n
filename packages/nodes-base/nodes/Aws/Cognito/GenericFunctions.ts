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
import { ApplicationError, jsonParse, NodeApiError, NodeOperationError } from 'n8n-workflow';

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

	if (!filterAttribute || !filterType || !filterValue) {
		throw new NodeOperationError(
			this.getNode(),
			'Please provide Filter Attribute, Filter Type, and Filter Value to use filtering.',
		);
	}

	const filterTypeMapping: { [key: string]: string } = {
		exactMatch: '=',
		startsWith: '^=',
	};
	filterType = filterTypeMapping[filterType] || filterType;

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

	return requestOptions;
}

export async function presendOptions(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const options = this.getNodeParameter('options', {}) as IDataObject;

	const hasOptions = options.Description || options.Precedence || options.Path || options.RoleArn;

	if (!hasOptions) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one of the options (Description, Precedence, Path, or RoleArn) must be provided to update the group.',
		);
	}

	return requestOptions;
}

export async function presendPath(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const path = this.getNodeParameter('path', '/') as string;

	if (path.length < 1 || path.length > 512) {
		throw new NodeOperationError(this.getNode(), 'Path must be between 1 and 512 characters.');
	}

	if (!/^\/$|^\/[\u0021-\u007E]+\/$/.test(path)) {
		throw new NodeOperationError(
			this.getNode(),
			'Path must begin and end with a forward slash and contain valid ASCII characters.',
		);
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

/* Helper function to handle pagination */
const possibleRootProperties = ['Users', 'Groups'];
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
		resultOptions.maxResults = limit > 60 ? 60 : limit;
	}
	resultOptions.paginate = true;

	const resource = this.getNodeParameter('resource') as string;
	const tokenKey = resource === 'group' ? 'NextToken' : 'PaginationToken';

	do {
		if (nextPageToken) {
			resultOptions.options.body = JSON.stringify({
				...(typeof resultOptions.options.body === 'string'
					? jsonParse(resultOptions.options.body)
					: resultOptions.options.body),
				[tokenKey]: nextPageToken,
			});
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

			nextPageToken = page.json.PaginationToken as string | undefined;
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

		if (resource === 'group') {
			if (operation === 'delete') {
				if (errorType === 'ResourceNotFoundException' || errorType === 'NoSuchEntity') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The group you are deleting could not be found.',
						description: 'Adjust the "Group" parameter setting to delete the group correctly.',
					});
				}
			} else if (operation === 'get') {
				if (errorType === 'ResourceNotFoundException' || errorType === 'NoSuchEntity') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The group you are requesting could not be found.',
						description: 'Adjust the "Group" parameter setting to retrieve the group correctly.',
					});
				}
			} else if (operation === 'update') {
				if (errorType === 'ResourceNotFoundException' || errorType === 'NoSuchEntity') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The group you are updating could not be found.',
						description: 'Adjust the "Group" parameter setting to update the group correctly.',
					});
				}
			} else if (operation === 'create') {
				if (errorType === 'EntityAlreadyExists' || errorType === 'GroupExistsException') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The group you are trying to create already exists',
						description: 'Adjust the "Group Name" parameter setting to create the group correctly.',
					});
				}
			}
		} else if (resource === 'user') {
			if (operation === 'create') {
				if (errorType === 'UserNotFoundException') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: "'Message Action: Resend' needs an existing user",
						description: 'Adjust the "User Name" parameter setting to create the user correctly.',
					});
				}
				if (
					errorType === 'UsernameExistsException' &&
					errorMessage === 'User account already exists'
				) {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The user you are trying to create already exists',
						description: 'Adjust the "User Name" parameter setting to create the user correctly.',
					});
				}
			} else if (operation === 'addToGroup') {
				if (errorType === 'UserNotFoundException') {
					const user = this.getNodeParameter('user.value', '') as string;

					if (typeof errorMessage === 'string' && errorMessage.includes(user)) {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: 'The user you are requesting could not be found.',
							description: 'Adjust the "User" parameter setting to retrieve the post correctly.',
						});
					}
				} else if (errorType === 'ResourceNotFoundException') {
					const group = this.getNodeParameter('group.value', '') as string;

					if (typeof errorMessage === 'string' && errorMessage.includes(group)) {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: 'The group you are requesting could not be found.',
							description: 'Adjust the "Group" parameter setting to retrieve the post correctly.',
						});
					}
				}
			} else if (operation === 'delete') {
				if (errorType === 'UserNotFoundException') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The user you are requesting could not be found.',
						description: 'Adjust the "User" parameter setting to retrieve the post correctly.',
					});
				}
			} else if (operation === 'get') {
				if (errorType === 'UserNotFoundException') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The user you are requesting could not be found.',
						description: 'Adjust the "User" parameter setting to retrieve the post correctly.',
					});
				}
			} else if (operation === 'removeFromGroup') {
				if (errorType === 'UserNotFoundException') {
					const user = this.getNodeParameter('user.value', '') as string;

					if (typeof errorMessage === 'string' && errorMessage.includes(user)) {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: 'The user you are deleting could not be found.',
							description: 'Adjust the "User" parameter setting to delete the user correctly.',
						});
					}
				} else if (errorType === 'ResourceNotFoundException') {
					const group = this.getNodeParameter('group.value', '') as string;

					if (typeof errorMessage === 'string' && errorMessage.includes(group)) {
						throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
							message: 'The group you are requesting could not be found.',
							description: 'Adjust the "Group" parameter setting to delete the user correctly.',
						});
					}
				}
			} else if (operation === 'update') {
				if (errorType === 'UserNotFoundException') {
					throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
						message: 'The user you are updating could not be found.',
						description: 'Adjust the "User" parameter setting to update the user correctly.',
					});
				}
			}
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
		url: '',
		method: 'POST',
		headers: {
			'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUserPools',
		},
		body: JSON.stringify({
			MaxResults: 60,
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

	return { results, paginationToken: responseData.NextToken };
}

export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userPoolIdRaw = this.getNodeParameter('userPoolId', '') as IDataObject;

	const userPoolId = userPoolIdRaw.value as string;

	if (!userPoolId) {
		throw new ApplicationError('User Pool ID is required to search users');
	}

	const opts: IHttpRequestOptions = {
		url: '',
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

	const responseData: IDataObject = await awsRequest.call(this, opts);

	const users = responseData.Users as IDataObject[] | undefined;

	if (!users) {
		console.warn('No users found in the response');
		return { results: [] };
	}

	const results: INodeListSearchItems[] = users
		.map((user) => {
			const attributes = user.Attributes as Array<{ Name: string; Value: string }> | undefined;

			const email = attributes?.find((attr) => attr.Name === 'email')?.Value;
			const sub = attributes?.find((attr) => attr.Name === 'sub')?.Value;
			const username = user.Username as string;

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

	return { results, paginationToken: responseData.NextToken as string | undefined };
}

export async function searchGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userPoolIdRaw = this.getNodeParameter('userPoolId', '') as IDataObject;

	const userPoolId = userPoolIdRaw.value as string;

	if (!userPoolId) {
		throw new ApplicationError('User Pool ID is required to search groups');
	}
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

	if (!groups) {
		return { results: [] };
	}

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
