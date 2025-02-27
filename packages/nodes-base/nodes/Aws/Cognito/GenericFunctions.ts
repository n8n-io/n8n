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

type UserPool = {
	Arn: string;
	CreationDate: number;
	DeletionProtection: string;
	Domain: string;
	EstimatedNumberOfUsers: number;
	Id: string;
	LastModifiedDate: number;
	MfaConfiguration: string;
	Name: string;
	UsernameAttributes?: string[];
};

type User = {
	Enabled: boolean;
	UserAttributes?: Array<{ Name: string; Value: string }>;
	Attributes?: Array<{ Name: string; Value: string }>;
	UserCreateDate: number;
	UserLastModifiedDate: number;
	UserStatus: string;
	Username: string;
};

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

export async function makeAwsRequest(
	this: ILoadOptionsFunctions | IPollFunctions | IExecuteSingleFunctions,
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

export async function getUserPoolConfigurationData(
	this: ILoadOptionsFunctions,
	userPoolId: string,
): Promise<IDataObject> {
	return await makeAwsRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool' },
		body: JSON.stringify({ UserPoolId: userPoolId }),
	});
}

function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

function validatePhoneNumber(phoneNumber: string): boolean {
	const phoneRegex = /^\+[0-9]\d{1,14}$/;
	return phoneRegex.test(phoneNumber);
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

export async function presendFilters(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const filters = this.getNodeParameter('filters') as IDataObject;

	if (!filters || !filters.filter) {
		return requestOptions;
	}

	const { attribute: filterAttribute, value: filterValue } = filters.filter as {
		attribute?: string;
		value?: string;
	};

	if (!filterValue) {
		throw new NodeApiError(this.getNode(), {
			message: "Invalid value for 'Value'",
			description: 'Please provide a value for filtering.',
		});
	}

	let body: IDataObject = {};
	if (typeof requestOptions.body === 'string') {
		try {
			body = JSON.parse(requestOptions.body);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Failed to parse requestOptions body');
		}
	} else if (requestOptions.body) {
		body = requestOptions.body as IDataObject;
	}

	const filter = filterAttribute ? `"${filterAttribute}"^="${filterValue}"` : '';

	return {
		...requestOptions,
		body: JSON.stringify({ ...body, Filter: filter }),
	};
}

export async function presendGroupFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const NewGroupName = this.getNodeParameter('NewGroupName', '') as string;

	const groupNameRegex = /^[\p{L}\p{M}\p{S}\p{N}\p{P}]+$/u;
	if (!groupNameRegex.test(NewGroupName)) {
		throw new NodeApiError(this.getNode(), {
			message: 'Invalid format for Group Name',
			description: 'Group Name should not contain spaces.',
		});
	}

	return requestOptions;
}

export async function presendAdditionalFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;

	if (!Object.keys(additionalFields).length) {
		throw new NodeApiError(this.getNode(), {
			message: 'No group field provided',
			description: 'Select at least one additional field to update.',
		});
	}

	return requestOptions;
}

export async function presendVerifyPath(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const path = this.getNodeParameter('path', '/') as string;

	if (!/^\/[\u0021-\u007E]*\/$/.test(path) || path.length > 512) {
		throw new NodeApiError(this.getNode(), {
			message: 'Invalid Path format',
			description:
				'Path must be between 1 and 512 characters, start and end with a forward slash, and contain valid ASCII characters.',
		});
	}

	return requestOptions;
}

export async function processAttributes(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	let body: Record<string, any> = {};

	if (typeof requestOptions.body === 'string') {
		try {
			body = JSON.parse(requestOptions.body);
		} catch {
			throw new ApplicationError('Invalid JSON body: Unable to parse.');
		}
	} else if (requestOptions.body && typeof requestOptions.body === 'object') {
		body = requestOptions.body as Record<string, any>;
	} else {
		throw new ApplicationError('Invalid request body: Expected a JSON string or object.');
	}

	const attributes = this.getNodeParameter('UserAttributes.attributes', []) as Array<{
		attributeType: string;
		standardName?: string;
		customName?: string;
		Value: string;
	}>;

	if (!attributes.length) {
		throw new NodeApiError(this.getNode(), {
			message: 'No user field provided',
			description: 'Select at least one user field to update.',
		});
	}

	body.UserAttributes = attributes.map(({ attributeType, standardName, customName, Value }) => {
		if (!Value) {
			throw new NodeApiError(this.getNode(), {
				message: 'Invalid User Attribute',
				description: 'Each attribute must have a value.',
			});
		}

		const attributeName =
			attributeType === 'standard'
				? standardName
				: customName?.startsWith('custom:')
					? customName
					: `custom:${customName}`;

		if (!attributeName) {
			throw new NodeApiError(this.getNode(), {
				message: 'Invalid Attribute Name',
				description: 'Each attribute must have a valid name.',
			});
		}

		return { Name: attributeName, Value };
	});

	requestOptions.body = JSON.stringify(body);

	return requestOptions;
}

export async function presendUserFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
	paginationToken?: string,
): Promise<IHttpRequestOptions> {
	const UserNameRaw = this.getNodeParameter('Username', '') as { mode: string; value: string };
	const UserName = UserNameRaw.value;

	const userPoolIdRaw = this.getNodeParameter('userPoolId', '') as { mode: string; value: string };
	const userPoolId = userPoolIdRaw.value;

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

	const userAttributes = await getUserPoolConfigurationData.call(
		this as unknown as ILoadOptionsFunctions,
		userPoolId,
	);
	const userPool = userAttributes?.UserPool as { UsernameAttributes?: string[] } | undefined;
	const usernameAttributes = userPool?.UsernameAttributes ?? [];

	const responseData: IDataObject = await makeAwsRequest.call(this, opts);
	const users = responseData.Users as IDataObject[] | undefined;

	let finalUsernameNew = '';
	let currentUser = '';
	if (users) {
		users.forEach((user) => {
			const username = user.Username as string;
			const attributes = user.Attributes as Array<{ Name: string; Value: string }> | undefined;
			const sub = attributes?.find((attr) => attr.Name === 'sub')?.Value ?? '';

			if (usernameAttributes.includes('email') || usernameAttributes.includes('phone_number')) {
				finalUsernameNew = sub;
			} else {
				finalUsernameNew = username;
			}

			if (sub === UserName) {
				currentUser = username;
			}
		});
	}

	if (this.getNodeParameter('operation') === 'create') {
		const newUsername = this.getNodeParameter('UsernameNew') as string;
		if (usernameAttributes.includes('email')) {
			if (!validateEmail(newUsername)) {
				throw new NodeApiError(this.getNode(), {
					message: 'Invalid format for User Name',
					description: 'Please provide a valid email address (e.g., name@gmail.com)',
				});
			}
			finalUsernameNew = newUsername;
		} else if (usernameAttributes.includes('phone_number')) {
			if (!validatePhoneNumber(newUsername)) {
				throw new NodeApiError(this.getNode(), {
					message: 'Invalid format for User Name',
					description:
						'Use an international phone number format, starting with + and followed by 2 to 15 digits (e.g., +14155552671)',
				});
			}
			finalUsernameNew = newUsername;
		} else {
			finalUsernameNew = UserName;
		}
	} else {
		if (usernameAttributes.includes('email') || usernameAttributes.includes('phone_number')) {
			finalUsernameNew = UserName;
		} else {
			finalUsernameNew = currentUser;
		}
	}

	let body: IDataObject;
	if (typeof requestOptions.body === 'string') {
		try {
			body = JSON.parse(requestOptions.body) as IDataObject;
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Failed to parse requestOptions body');
		}
	} else {
		body = (requestOptions.body as IDataObject) || {};
	}

	if (finalUsernameNew) {
		requestOptions.body = JSON.stringify({
			...body,
			Username: finalUsernameNew,
		});
	}

	return requestOptions;
}

export async function searchUserPools(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const responseData = await makeAwsRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUserPools' },
		body: JSON.stringify({ MaxResults: 60, NextToken: paginationToken }),
	});

	const userPools = (responseData.UserPools as Array<{ Name: string; Id: string }>) || [];

	const filterLower = filter?.toLowerCase();
	const results = userPools
		.map(({ Name, Id }) => ({ name: Name, value: Id }))
		.filter(
			({ name, value }) =>
				!filterLower ||
				name.toLowerCase().includes(filterLower) ||
				value.toLowerCase().includes(filterLower),
		)
		.sort((a, b) => a.name.localeCompare(b.name));

	return { results, paginationToken: responseData.NextToken };
}

export async function listUsersInGroup(
	this: IExecuteSingleFunctions,
	groupName: string,
	userPoolId: string,
): Promise<IDataObject> {
	if (!userPoolId) {
		throw new ApplicationError('User Pool ID is required');
	}

	const opts: IHttpRequestOptions = {
		url: '',
		method: 'POST',
		headers: {
			'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsersInGroup',
		},
		body: JSON.stringify({
			UserPoolId: userPoolId,
			GroupName: groupName,
			MaxResults: 60,
		}),
	};

	const responseData: IDataObject = await makeAwsRequest.call(this, opts);
	const users = responseData.Users as IDataObject[] | undefined;

	if (!users) {
		return { results: [] };
	}

	const results = users
		.map((user) => {
			const userAttributes = Object.fromEntries(
				(user.Attributes as Array<{ Name: string; Value: string }> | undefined)?.map(
					({ Name, Value }) => (Name === 'sub' ? ['Sub', Value] : [Name, Value]),
				) ?? [],
			);

			const username = user.Username as string;

			return {
				Enabled: user.Enabled,
				...Object.fromEntries(Object.entries(userAttributes).slice(0, 6)),
				UserCreateDate: user.UserCreateDate,
				UserLastModifiedDate: user.UserLastModifiedDate,
				UserStatus: user.UserStatus,
				Username: username,
			};
		})
		.sort((a, b) => a.Username.toLowerCase().localeCompare(b.Username.toLowerCase()));

	return { results, paginationToken: responseData.NextToken as string | undefined };
}

export async function listGroups(
	this: ILoadOptionsFunctions,
	userPoolId: string,
): Promise<IDataObject[]> {
	const listGroupsOpts: IHttpRequestOptions = {
		url: '',
		method: 'POST',
		headers: {
			'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups',
		},
		body: JSON.stringify({
			UserPoolId: userPoolId,
			MaxResults: 60,
		}),
	};

	const responseData: IDataObject = await makeAwsRequest.call(this, listGroupsOpts);
	const responseBody = responseData as { Groups: IDataObject[] };
	const groups = responseBody?.Groups;

	return groups || [];
}

export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userPoolId = (this.getNodeParameter('userPoolId', '') as IDataObject).value as string;

	if (!userPoolId) {
		throw new ApplicationError('User Pool ID is required to search users');
	}

	const opts: IHttpRequestOptions = {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers' },
		body: JSON.stringify({
			UserPoolId: userPoolId,
			MaxResults: 60,
			NextToken: paginationToken,
		}),
	};

	const userPoolData: IDataObject = await getUserPoolConfigurationData.call(this, userPoolId);
	const userPool = userPoolData?.UserPool as IDataObject;

	const usernameAttributes =
		userPool && 'UsernameAttributes' in userPool ? (userPool.UsernameAttributes as string[]) : [];

	const responseData: IDataObject = await makeAwsRequest.call(this, opts);
	const users = responseData.Users as IDataObject[] | undefined;

	if (!users) return { results: [] };

	const results: INodeListSearchItems[] = users
		.map((user) => {
			const attributes = user.Attributes as Array<{ Name: string; Value: string }> | undefined;
			const username = user.Username as string;
			const email = attributes?.find((attr) => attr.Name === 'email')?.Value ?? '';
			const phoneNumber = attributes?.find((attr) => attr.Name === 'phone_number')?.Value ?? '';
			const sub = attributes?.find((attr) => attr.Name === 'sub')?.Value ?? '';

			const name = usernameAttributes.includes('email')
				? email
				: usernameAttributes.includes('phone_number')
					? phoneNumber
					: username;

			return { name, value: sub };
		})
		.filter(
			(user) =>
				!filter ||
				user.name.toLowerCase().includes(filter.toLowerCase()) ||
				user.value.toLowerCase().includes(filter.toLowerCase()),
		)
		.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

	return { results, paginationToken: responseData.NextToken as string | undefined };
}

export async function searchUsersForGroup(
	this: IExecuteSingleFunctions,
	groupName: string,
	userPoolId: string,
): Promise<IDataObject[]> {
	const users = await listUsersInGroup.call(this, groupName, userPoolId);

	return users.results && Array.isArray(users.results) ? users.results : [];
}

export async function isUserInGroup(
	this: IExecuteSingleFunctions,
	groupName: string,
	userPoolId: string,
	userName: string,
): Promise<boolean> {
	const usersInGroup = await searchUsersForGroup.call(this, groupName, userPoolId);
	return usersInGroup.some((user) => user.Username === userName);
}

export async function searchGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userPoolId = (this.getNodeParameter('userPoolId', '') as IDataObject).value as string;

	if (!userPoolId) {
		throw new ApplicationError('User Pool ID is required to search groups');
	}

	const opts: IHttpRequestOptions = {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
		body: JSON.stringify({
			UserPoolId: userPoolId,
			MaxResults: 60,
			NextToken: paginationToken,
		}),
	};

	const responseData: IDataObject = await makeAwsRequest.call(this, opts);
	const groups = responseData.Groups as Array<{ GroupName?: string }> | undefined;

	if (!groups) return { results: [] };

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
		.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

	return { results, paginationToken: responseData.NextToken };
}

export async function searchGroupsForUser(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { value: userName } = this.getNodeParameter('Username') as { mode: string; value: string };
	const userPoolId = (this.getNodeParameter('userPoolId', '') as IDataObject).value as string;

	if (!userName || !userPoolId) {
		console.warn('⚠️ Missing required parameters: User or User Pool');
		return { results: [] };
	}

	const groups = await listGroups.call(this, userPoolId);
	if (!groups.length) return { results: [] };

	const groupCheckPromises = groups.map(async (group) => {
		const groupName = group.GroupName as string;
		if (!groupName) return null;

		const isUserInGroupFlag = await isUserInGroup.call(
			this as unknown as IExecuteSingleFunctions,
			groupName,
			userPoolId,
			userName,
		);

		return isUserInGroupFlag ? { name: groupName, value: groupName } : null;
	});

	const resolvedResults = await Promise.all(groupCheckPromises);
	const validUserGroups = resolvedResults.filter(Boolean) as INodeListSearchItems[];

	const filteredGroups = validUserGroups
		.filter((group) => !filter || group.name.toLowerCase().includes(filter.toLowerCase()))
		.sort((a, b) => a.name.localeCompare(b.name));

	return { results: filteredGroups, paginationToken };
}

export function mapUserAttributes(
	userAttributes: Array<{ Name: string; Value: string }> | undefined,
): Record<string, string> {
	if (!userAttributes) {
		return {};
	}

	return userAttributes.reduce(
		(acc, { Name, Value }) => {
			acc[Name === 'sub' ? 'Sub' : Name] = Value;
			return acc;
		},
		{} as Record<string, string>,
	);
}

export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const userPoolId = (this.getNodeParameter('userPoolId') as IDataObject).value as string;
	const include = this.getNodeParameter('includeUsers', 0) as boolean;
	const responseBody = response.body as { Group: IDataObject; Users?: IDataObject[] };

	if (!include) {
		return responseBody.Group ? [{ json: responseBody.Group }] : items;
	}

	const processedGroups: IDataObject[] = [];

	if (responseBody.Group) {
		const group = responseBody.Group;
		const usersResponse = await searchUsersForGroup.call(
			this,
			group.GroupName as string,
			userPoolId,
		);
		return [{ json: { ...group, Users: usersResponse.length ? usersResponse : [] } }];
	}

	const groups = (responseBody as unknown as { Groups: IDataObject[] }).Groups || [];
	for (const group of groups) {
		const usersResponse = await searchUsersForGroup.call(
			this,
			group.GroupName as string,
			userPoolId,
		);
		processedGroups.push({
			...group,
			Users: usersResponse.length ? usersResponse : [],
		});
	}

	return items.map((item) => ({ json: { ...item.json, Groups: processedGroups } }));
}

export async function handleErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const resource = this.getNodeParameter('resource') as string;
		const operation = this.getNodeParameter('operation') as string;
		const responseBody = response.body as IDataObject;
		const errorType: string | undefined =
			typeof responseBody.__type === 'string'
				? responseBody.__type
				: typeof response.headers?.['x-amzn-errortype'] === 'string'
					? response.headers?.['x-amzn-errortype']
					: undefined;
		const errorMessage: string | undefined =
			typeof responseBody.message === 'string'
				? responseBody.message
				: typeof response.headers?.['x-amzn-errormessage'] === 'string'
					? response.headers?.['x-amzn-errormessage']
					: undefined;

		const throwError = (message: string, description: string) => {
			throw new NodeApiError(this.getNode(), response as unknown as JsonObject, {
				message,
				description,
			});
		};

		const errorMappings: Record<
			string,
			Record<
				string,
				{
					condition: (errorType: string, errorMessage: string) => boolean;
					message: string;
					description: string;
				}
			>
		> = {
			group: {
				delete: {
					condition: (errType) =>
						errType === 'ResourceNotFoundException' || errType === 'NoSuchEntity',
					message: 'The group you are deleting could not be found.',
					description: 'Adjust the "Group" parameter setting to delete the group correctly.',
				},
				get: {
					condition: (errType) =>
						errType === 'ResourceNotFoundException' || errType === 'NoSuchEntity',
					message: 'The group you are requesting could not be found.',
					description: 'Adjust the "Group" parameter setting to retrieve the group correctly.',
				},
				update: {
					condition: (errType) =>
						errType === 'ResourceNotFoundException' || errType === 'NoSuchEntity',
					message: 'The group you are updating could not be found.',
					description: 'Adjust the "Group" parameter setting to update the group correctly.',
				},
				create: {
					condition: (errType) =>
						errType === 'EntityAlreadyExists' || errType === 'GroupExistsException',
					message: 'The group you are trying to create already exists.',
					description: 'Adjust the "Group Name" parameter setting to create the group correctly.',
				},
			},
			user: {
				create: {
					condition: (errType, errMsg) =>
						errType === 'UserNotFoundException' ||
						(errType === 'UsernameExistsException' && errMsg === 'User account already exists'),
					message: 'The user you are trying to create already exists.',
					description: 'Adjust the "User Name" parameter setting to create the user correctly.',
				},
				addToGroup: {
					condition: (errType, errMsg) => {
						const user = this.getNodeParameter('user.value', '') as string;
						const group = this.getNodeParameter('group.value', '') as string;
						return (
							(errType === 'UserNotFoundException' &&
								typeof errMsg === 'string' &&
								errMsg.includes(user)) ||
							(errType === 'ResourceNotFoundException' &&
								typeof errMsg === 'string' &&
								errMsg.includes(group))
						);
					},
					message: 'The user/group you are trying to add could not be found.',
					description:
						'Adjust the "User" and "Group" parameters to add the user to the group correctly.',
				},
				delete: {
					condition: (errType) => errType === 'UserNotFoundException',
					message: 'The user you are requesting could not be found.',
					description: 'Adjust the "User" parameter setting to delete the user correctly.',
				},
				get: {
					condition: (errType) => errType === 'UserNotFoundException',
					message: 'The user you are requesting could not be found.',
					description: 'Adjust the "User" parameter setting to retrieve the user correctly.',
				},
				removeFromGroup: {
					condition: (errType, errMsg) => {
						const user = this.getNodeParameter('user.value', '') as string;
						const group = this.getNodeParameter('group.value', '') as string;
						return (
							(errType === 'UserNotFoundException' &&
								typeof errMsg === 'string' &&
								errMsg.includes(user)) ||
							(errType === 'ResourceNotFoundException' &&
								typeof errMsg === 'string' &&
								errMsg.includes(group))
						);
					},
					message: 'The user/group you are trying to remove could not be found.',
					description:
						'Adjust the "User" and "Group" parameters to remove the user from the group correctly.',
				},
				update: {
					condition: (errType) => errType === 'UserNotFoundException',
					message: 'The user you are updating could not be found.',
					description: 'Adjust the "User" parameter setting to update the user correctly.',
				},
			},
		};

		const resourceMapping = errorMappings[resource]?.[operation];
		if (resourceMapping && resourceMapping.condition(errorType ?? '', errorMessage ?? '')) {
			throwError(resourceMapping.message, resourceMapping.description);
		}

		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}

	return data;
}

export async function simplifyData(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const simple = this.getNodeParameter('simple') as boolean;

	if (!simple) {
		return items;
	}

	const resource = this.getNodeParameter('resource');
	const operation = this.getNodeParameter('operation');

	const simplifiedItems = items
		.map((item) => {
			const data = item.json?.UserPool as UserPool | undefined;
			const userData = item.json as User | undefined;
			const users = item.json?.Users as User[] | undefined;

			switch (resource) {
				case 'userPool':
					if (data) {
						return {
							json: {
								UserPool: {
									Arn: data.Arn,
									CreationDate: data.CreationDate,
									DeletionProtection: data.DeletionProtection,
									Domain: data.Domain,
									EstimatedNumberOfUsers: data.EstimatedNumberOfUsers,
									Id: data.Id,
									LastModifiedDate: data.LastModifiedDate,
									MfaConfiguration: data.MfaConfiguration,
									Name: data.Name,
								},
							},
						};
					}
					break;

				case 'user':
					if (userData) {
						if (operation === 'get') {
							const userAttributes = userData.UserAttributes
								? mapUserAttributes(userData.UserAttributes)
								: {};
							return {
								json: {
									Enabled: userData.Enabled,
									...Object.fromEntries(Object.entries(userAttributes).slice(0, 6)),
									UserCreateDate: userData.UserCreateDate,
									UserLastModifiedDate: userData.UserLastModifiedDate,
									UserStatus: userData.UserStatus,
									Username: userData.Username,
								},
							};
						} else if (operation === 'getAll') {
							if (users && Array.isArray(users)) {
								const processedUsers: User[] = [];
								users.forEach((user) => {
									const userAttributes = user.Attributes ? mapUserAttributes(user.Attributes) : {};
									processedUsers.push({
										Enabled: user.Enabled,
										...Object.fromEntries(Object.entries(userAttributes).slice(0, 6)),
										UserCreateDate: user.UserCreateDate,
										UserLastModifiedDate: user.UserLastModifiedDate,
										UserStatus: user.UserStatus,
										Username: user.Username,
									});
								});
								return {
									json: {
										Users: processedUsers,
									},
								};
							}
						}
					}
					break;
			}

			return undefined;
		})
		.filter((item) => item !== undefined)
		.flat();

	return simplifiedItems;
}
