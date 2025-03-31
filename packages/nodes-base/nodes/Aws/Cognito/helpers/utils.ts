import type {
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { jsonParse, NodeApiError, NodeOperationError, OperationalError } from 'n8n-workflow';

import type { IListUsersResponse, IUser, IUserAttribute, IUserPool } from './interfaces';
import { awsApiRequest } from '../transport';

const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhoneNumber = (phone: string): boolean => /^\+[0-9]\d{1,14}$/.test(phone);

// Todo: jsonParse could be used directly
export function parseRequestBody(body: unknown): IDataObject {
	if (!body) {
		return {};
	}

	if (typeof body === 'string') {
		try {
			return jsonParse(body);
		} catch {
			throw new OperationalError('Failed to parse requestOptions body');
		}
	}

	if (typeof body === 'object') {
		return body as IDataObject;
	}

	throw new OperationalError('Invalid body type for requestOptions');
}

export function mapUserAttributes(userAttributes?: IUserAttribute[]): Record<string, string> {
	if (!userAttributes?.length) {
		return {};
	}

	return userAttributes.reduce<Record<string, string>>((acc, { Name, Value }) => {
		if (Name?.trim()) {
			// Todo: is this line necessary?
			acc[Name === 'sub' ? 'Sub' : Name] = Value ?? '';
		}
		return acc;
	}, {});
}

// Todo: split up simplify for each resource and operation, because it doesn't seem they have any common functionality
// Todo: is it required to .slice(0, 6)? Why not return all?
export async function simplifyData(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const simple = this.getNodeParameter('simple') as boolean;

	if (!simple) {
		return items;
	}

	const resource = this.getNodeParameter('resource') as string;
	const operation = this.getNodeParameter('operation') as string;

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

export async function preSendStringifyBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	if (requestOptions.body) {
		requestOptions.body = JSON.stringify(requestOptions.body);
	}
	return requestOptions;
}

// Todo: the nested functions makes the function less readable. Move the functions to the root level.
// Todo: is it necessary to call this function for get requests? Doesn't the response contain any error message for this?
export async function preSendUserFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
	paginationToken?: string,
): Promise<IHttpRequestOptions> {
	const operation = this.getNodeParameter('operation') as string;
	const userPoolId = this.getNodeParameter('userPoolId', undefined, {
		extractValue: true,
	}) as string;

	const { UserPool } = (await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool' },
		body: JSON.stringify({ UserPoolId: userPoolId }),
	})) as { UserPool?: IUserPool };

	const usernameAttributes = UserPool?.UsernameAttributes ?? [];
	const isEmailAuth = usernameAttributes.includes('email');
	const isPhoneAuth = usernameAttributes.includes('phone_number');
	const isEmailOrPhone = isEmailAuth || isPhoneAuth;

	const getValidatedNewUserName = (): string => {
		const newUsername = this.getNodeParameter('newUserName') as string;

		if (isEmailAuth && !validateEmail(newUsername)) {
			throw new NodeApiError(this.getNode(), {
				message: 'Invalid email format',
				description: 'Please provide a valid email (e.g., name@gmail.com)',
			});
		}
		if (isPhoneAuth && !validatePhoneNumber(newUsername)) {
			throw new NodeApiError(this.getNode(), {
				message: 'Invalid phone number format',
				description: 'Please provide a valid phone number (e.g., +14155552671)',
			});
		}

		return newUsername;
	};

	const getUserNameFromExistingUsers = async (): Promise<string | undefined> => {
		const userSub = this.getNodeParameter('userName', undefined, {
			extractValue: true,
		}) as string;

		const { Users } = (await awsApiRequest.call(this as unknown as ILoadOptionsFunctions, {
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

		// Todo: why call API when it is not required for this check: isEmailOrPhone ? userSub
		return isEmailOrPhone ? userSub : matchedUser?.Username;
	};

	const finalUserName =
		operation === 'create' ? getValidatedNewUserName() : await getUserNameFromExistingUsers();

	const body = parseRequestBody(requestOptions.body);
	return {
		...requestOptions,
		body: JSON.stringify({
			...body,
			...(finalUserName ? { Username: finalUserName } : {}),
		}),
	};
}

// Todo: use interface for user
// Todo: paginationToken not used
export async function getUsersInGroup(
	this: IExecuteSingleFunctions | ILoadOptionsFunctions,
	groupName: string,
	userPoolId: string,
): Promise<IDataObject> {
	if (!userPoolId) {
		throw new NodeOperationError(this.getNode(), 'User Pool ID is required');
	}

	const responseData: IDataObject = await awsApiRequest.call(this, {
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
	});
	const users = responseData.Users as IDataObject[];

	if (!users.length) {
		return { results: [] };
	}

	const results = users
		.map(({ Username, Enabled, UserCreateDate, UserLastModifiedDate, UserStatus, Attributes }) => {
			const userAttributes = Array.isArray(Attributes)
				? Object.fromEntries(
						Attributes.slice(0, 6).map(({ Name, Value }) => [Name === 'sub' ? 'Sub' : Name, Value]),
					)
				: {};

			return {
				Enabled,
				...userAttributes,
				UserCreateDate,
				UserLastModifiedDate,
				UserStatus,
				Username,
			};
		})
		.sort((a, b) => a.Username.toLowerCase().localeCompare(b.Username.toLowerCase()));

	return { results, paginationToken: responseData.NextToken };
}

export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const userPoolId = this.getNodeParameter('userPoolId', undefined, {
		extractValue: true,
	}) as string;
	const include = this.getNodeParameter('includeUsers') as boolean;
	const body = parseRequestBody(response.body);

	if (!include) {
		// Todo: what does items include when !body?.Group ? Other places return empty array instead of items
		return body?.Group ? [{ json: body.Group as IDataObject }] : items;
	}

	if (body?.Group) {
		const group = body.Group as IDataObject;
		const users = await getUsersInGroup.call(this, group.GroupName as string, userPoolId);

		return [{ json: { ...group, Users: users.results ?? [] } }];
	}

	// Todo: this will not get called because of previous if (body?.Group)
	const processedGroups: IDataObject[] = [];
	const groups = Array.isArray(body?.Groups) ? body.Groups : [];
	for (const group of groups) {
		const usersResponse = await getUsersInGroup.call(this, group.GroupName as string, userPoolId);
		processedGroups.push({
			...group,
			Users: usersResponse ?? [],
		});
	}

	return items.map((item) => ({ json: { ...item.json, Groups: processedGroups } }));
}

export async function validateArn(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const arn = this.getNodeParameter('additionalFields.arn', '') as string;
	const arnRegex =
		/^arn:[-.\w+=/,@]+:[-.\w+=/,@]+:([-.\w+=/,@]*)?:[0-9]+:[-.\w+=/,@]+(:[-.\w+=/,@]+)?(:[-.\w+=/,@]+)?$/;

	if (!arnRegex.test(arn)) {
		throw new NodeApiError(this.getNode(), {
			message: 'Invalid ARN format',
			description:
				'Please provide a valid AWS ARN (e.g., arn:aws:iam::123456789012:role/GroupRole).',
		});
	}

	return requestOptions;
}
