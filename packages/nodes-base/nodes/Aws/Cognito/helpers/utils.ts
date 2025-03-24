import {
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	jsonParse,
	NodeApiError,
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	ApplicationError,
} from 'n8n-workflow';

import type {
	Filters,
	IListUsersResponse,
	IUser,
	IUserAttribute,
	IUserAttributeInput,
	IUserPool,
} from './interfaces';
import { makeAwsRequest } from '../transport';

//REFACTORED FUNCTIONS

export function parseRequestBody(body: unknown): IDataObject {
	if (body === null || body === undefined) {
		return {};
	}

	if (typeof body === 'string') {
		try {
			return jsonParse(body);
		} catch {
			throw new ApplicationError('Failed to parse requestOptions body');
		}
	}

	if (typeof body === 'object') {
		return body as IDataObject;
	}

	throw new ApplicationError('Invalid body type for requestOptions');
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
			const data = item.json?.UserPool as IDataObject | undefined;
			const userData = item.json as IDataObject | undefined;
			const users = item.json?.Users as IDataObject[] | undefined;
			switch (resource) {
				case 'userPool':
					if (data) {
						const {
							AccountRecoverySetting,
							AdminCreateUserConfig,
							EmailConfiguration,
							LambdaConfig,
							Policies,
							SchemaAttributes,
							UserAttributeUpdateSettings,
							UserPoolTags,
							UserPoolTier,
							VerificationMessageTemplate,
							...selectedData
						} = data;
						return {
							json: {
								UserPool: {
									...selectedData,
								},
							},
						};
					}
					break;

				case 'user':
					if (userData) {
						if (operation === 'get') {
							const attributesArray = Array.isArray(userData.UserAttributes)
								? userData.UserAttributes.slice(0, 6)
								: [];
							const userAttributes = mapUserAttributes(attributesArray);
							const { UserAttributes, ...selectedData } = userData;
							return {
								json: {
									...selectedData,
									...userAttributes,
								},
							};
						} else if (operation === 'getAll') {
							if (users && Array.isArray(users)) {
								const processedUsers: IDataObject[] = [];
								users.forEach((user) => {
									const attributesArray = Array.isArray(user.Attributes)
										? user.Attributes.slice(0, 6)
										: [];
									const { Attributes, ...selectedData } = user;
									const userAttributes = mapUserAttributes(attributesArray);
									processedUsers.push({
										...selectedData,
										...userAttributes,
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

const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhoneNumber = (phone: string): boolean => /^\+[0-9]\d{1,14}$/.test(phone);

export async function presendUserFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
	paginationToken?: string,
): Promise<IHttpRequestOptions> {
	const operation = this.getNodeParameter('operation') as string;
	const userPoolId = (this.getNodeParameter('userPoolId') as IDataObject).value as string;

	const { UserPool } = (await makeAwsRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool' },
		body: JSON.stringify({ UserPoolId: userPoolId }),
	})) as { UserPool?: IUserPool };

	const usernameAttributes = UserPool?.UsernameAttributes ?? [];

	const isEmailAuth = usernameAttributes.includes('email');
	const isPhoneAuth = usernameAttributes.includes('phone_number');

	const isEmailOrPhone = isEmailAuth || isPhoneAuth;

	const getValidatedNewUsername = (): string => {
		const newUsername = this.getNodeParameter('newUserName') as string;

		return isEmailAuth
			? validateEmail(newUsername)
				? newUsername
				: throwInvalid('email', 'name@gmail.com')
			: isPhoneAuth
				? validatePhoneNumber(newUsername)
					? newUsername
					: throwInvalid('phone number', '+14155552671')
				: newUsername;
	};

	const throwInvalid = (type: string, example: string): never => {
		throw new NodeApiError(this.getNode(), {
			message: `Invalid ${type} format`,
			description: `Please provide a valid ${type} (e.g., ${example})`,
		});
	};

	const getUsernameFromExistingUsers = async (): Promise<string | undefined> => {
		const userSub = (this.getNodeParameter('userName') as IDataObject).value as string;

		const { Users } = (await makeAwsRequest.call(this as unknown as ILoadOptionsFunctions, {
			url: '',
			method: 'POST',
			headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers' },
			body: JSON.stringify({
				UserPoolId: userPoolId,
				MaxResults: 60,
				NextToken: paginationToken,
			}),
		})) as unknown as IListUsersResponse;

		const matchedUser = Users?.find(
			(user: IUser) => user.Attributes.find((attr) => attr.Name === 'sub')?.Value === userSub,
		);

		return isEmailOrPhone ? userSub : matchedUser?.Username;
	};

	const finalUsername =
		operation === 'create' ? getValidatedNewUsername() : await getUsernameFromExistingUsers();

	const body = parseRequestBody(requestOptions.body);

	return {
		...requestOptions,
		body: JSON.stringify({
			...body,
			...(finalUsername ? { Username: finalUsername } : {}),
		}),
	};
}
////

export async function listUsersInGroup(
	this: IExecuteSingleFunctions | ILoadOptionsFunctions,
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
	const users = responseData.Users as IDataObject[];

	if (!users) {
		return { results: [] };
	}

	const results = users
		.map((user) => {
			const userAttributes = Object.fromEntries(
				Array.isArray(user.Attributes)
					? user.Attributes.map(({ Name, Value }) =>
							Name === 'sub' ? ['Sub', Value] : [Name, Value],
						)
					: [],
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

	return { results, paginationToken: responseData.NextToken };
}

export function mapUserAttributes(userAttributes?: IDataObject[]): IDataObject {
	if (!userAttributes) {
		return {};
	}

	// If the attribute name is 'sub', we map it to 'Sub' in the result
	return userAttributes.reduce<IDataObject>((acc, { Name, Value }) => {
		if (typeof Name === 'string' && Name.trim() !== '') {
			acc[Name === 'sub' ? 'Sub' : Name] = Value ?? '';
		}
		return acc;
	}, {});
}

export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const userPoolId = (this.getNodeParameter('userPoolId') as IDataObject).value as string;
	const include = this.getNodeParameter('includeUsers');
	const body = parseRequestBody(response.body);

	if (!include) {
		return body.Group ? [{ json: body.Group }] : items;
	}

	const processedGroups: IDataObject[] = [];

	if (body.Group) {
		const group = body.Group;
		const users = await listUsersInGroup.call(this, group.GroupName, userPoolId);

		const usersResponse = users.results && Array.isArray(users.results) ? users.results : [];

		return [{ json: { ...group, Users: usersResponse.length ? usersResponse : [] } }];
	}

	const groups = body.Groups || [];
	for (const group of groups) {
		const usersResponse = await listUsersInGroup.call(this, group.GroupName, userPoolId);
		processedGroups.push({
			...group,
			Users: usersResponse.length ? usersResponse : [],
		});
	}

	return items.map((item) => ({ json: { ...item.json, Groups: processedGroups } }));
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

//
//TO-BE-DELETED
export async function presendGroupFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const newGroupName = this.getNodeParameter('newGroupName', '') as string;

	const groupNameRegex = /^[\p{L}\p{M}\p{S}\p{N}\p{P}]+$/u;
	if (!groupNameRegex.test(newGroupName)) {
		throw new NodeApiError(this.getNode(), {
			message: 'Invalid format for Group Name',
			description: 'Group Name should not contain spaces.',
		});
	}

	return requestOptions;
}

export async function presendFilters(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const filters = this.getNodeParameter('filters', {}) as Filters;

	const filter = filters.filter;

	if (!filter?.value) return requestOptions;

	const { attribute: filterAttribute, value: filterValue } = filter;

	const body = parseRequestBody(requestOptions.body);

	const filterString = filterAttribute ? `"${filterAttribute}"^="${filterValue}"` : '';

	return {
		...requestOptions,
		body: JSON.stringify({ ...body, Filter: filterString }),
	};
}

export async function presendAdditionalFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additionalFields = this.getNodeParameter('additionalFields', {}) as IDataObject;

	if (Object.keys(additionalFields).length === 0) {
		throw new NodeApiError(this.getNode(), {
			message: 'No group field provided',
			description: 'Select at least one additional field to update.',
		});
	}

	return requestOptions;
}

export async function presendAttributes(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const attributes = this.getNodeParameter(
		'userAttributes.attributes',
		[],
	) as IUserAttributeInput[];

	const body = parseRequestBody(requestOptions.body);

	body.UserAttributes = attributes.map(({ attributeType, standardName, customName, Value }) => {
		if (!Value || !attributeType || !(standardName || customName)) {
			throw new NodeApiError(this.getNode(), {
				message: 'Invalid User Attribute',
				description: 'Each attribute must have a valid name and value.',
			});
		}

		const attributeName =
			attributeType === 'standard'
				? standardName
				: `custom:${customName?.startsWith('custom:') ? customName : customName}`;

		return { Name: attributeName, Value };
	});

	requestOptions.body = JSON.stringify(body);
	return requestOptions;
}

//
