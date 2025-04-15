import type {
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { jsonParse, NodeApiError, NodeOperationError } from 'n8n-workflow';

import type {
	IGroup,
	IListGroupsResponse,
	IUser,
	IUserAttribute,
	IUserAttributeInput,
	IUserPool,
} from './interfaces';
// eslint-disable-next-line import/no-cycle
import { searchUsers } from '../methods/listSearch';
import { awsApiRequest } from '../transport';

const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhoneNumber = (phone: string): boolean => /^\+[0-9]\d{1,14}$/.test(phone);

export async function preSendStringifyBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	if (requestOptions.body) {
		requestOptions.body = JSON.stringify(requestOptions.body);
	}
	return requestOptions;
}

export async function getUserPool(
	this: IExecuteSingleFunctions | ILoadOptionsFunctions,
	userPoolId: string,
): Promise<IUserPool> {
	if (!userPoolId) {
		throw new NodeOperationError(this.getNode(), 'User Pool ID is required');
	}

	const response = (await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool' },
		body: JSON.stringify({ UserPoolId: userPoolId }),
	})) as IDataObject;

	if (!response?.UserPool) {
		throw new NodeOperationError(this.getNode(), 'User Pool not found in response');
	}

	return response.UserPool as IUserPool;
}

export async function searchUsersForGroup(
	this: IExecuteSingleFunctions | ILoadOptionsFunctions,
	groupName: string,
	userPoolId: string,
	paginationToken?: string,
): Promise<IDataObject> {
	if (!userPoolId) {
		throw new NodeOperationError(this.getNode(), 'User Pool ID is required');
	}

	const requestBody: IDataObject = {
		UserPoolId: userPoolId,
		GroupName: groupName,
		Limit: 50,
	};

	if (paginationToken) {
		requestBody.NextToken = paginationToken;
	}

	const responseData = (await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: {
			'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsersInGroup',
		},
		body: JSON.stringify(requestBody),
	})) as IDataObject;

	const users = responseData.Users as IUser[];

	if (users.length === 0) {
		return { results: [] };
	}

	const results = users.map(
		({
			Username,
			Enabled,
			UserCreateDate,
			UserLastModifiedDate,
			UserStatus,
			Attributes,
		}: IUser) => {
			const userAttributes = Object.fromEntries(
				(Attributes ?? [])
					.filter(({ Name }) => Name?.trim())
					.map(({ Name, Value }) => [Name, Value ?? '']),
			);
			return {
				Enabled,
				...userAttributes,
				UserCreateDate,
				UserLastModifiedDate,
				UserStatus,
				Username,
			};
		},
	);

	return {
		results,
	};
}

export async function preSendUserFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const operation = this.getNodeParameter('operation') as string;
	const userPoolId = this.getNodeParameter('userPool', undefined, {
		extractValue: true,
	}) as string;
	const userPoolResponse = (await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool' },
		body: JSON.stringify({ UserPoolId: userPoolId }),
	})) as IDataObject;

	const userPool = userPoolResponse.UserPool as IUserPool;
	const usernameAttributes = userPool.UsernameAttributes ?? [];
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
		const userName = this.getNodeParameter('user', undefined, {
			extractValue: true,
		}) as string;

		if (isEmailOrPhone) {
			return userName;
		}

		const { results: users } = await searchUsers.call(this);

		const matchedUser = users?.find((user) => user.value === userName);

		return matchedUser?.name;
	};

	const finalUserName =
		operation === 'create' ? getValidatedNewUserName() : await getUserNameFromExistingUsers();

	const body = jsonParse<IDataObject>(String(requestOptions.body), {
		acceptJSObject: true,
		errorMessage: 'Invalid request body. Request body must be valid JSON.',
	});

	return {
		...requestOptions,
		body: JSON.stringify({
			...body,
			...(finalUserName ? { Username: finalUserName } : {}),
		}),
	};
}

export async function processGroupResponse(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const userPoolId = this.getNodeParameter('userPool', undefined, {
		extractValue: true,
	}) as string;
	const include = this.getNodeParameter('includeUsers') as boolean;
	const responseBody = response.body as { Group: IGroup };
	const group = responseBody.Group ?? [];

	if (!include) return this.helpers.returnJsonArray({ ...group });

	const users = await searchUsersForGroup.call(this, group.GroupName, userPoolId);
	return this.helpers.returnJsonArray({ ...group, Users: users.results ?? [] });
}

export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const userPoolId = this.getNodeParameter('userPool', undefined, {
		extractValue: true,
	}) as string;
	const includeUsers = this.getNodeParameter('includeUsers') as boolean;
	const responseBody = response.body as IListGroupsResponse;
	const groups = responseBody.Groups ?? [];

	if (!includeUsers) {
		return items;
	}

	const processedGroups: IDataObject[] = [];
	for (const group of groups) {
		const usersResponse = await searchUsersForGroup.call(this, group.GroupName, userPoolId);
		processedGroups.push({
			...group,
			Users: usersResponse.results ?? [],
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

export async function simplifyUserPool(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const simple = this.getNodeParameter('simple') as boolean;
	if (!simple) {
		return items;
	}
	return items
		.map((item) => {
			const data = item.json?.UserPool as IUserPool;
			if (!data) {
				return;
			}

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

			return { json: { UserPool: { ...selectedData } } };
		})
		.filter(Boolean) as INodeExecutionData[];
}

export async function simplifyUser(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const simple = this.getNodeParameter('simple') as boolean;
	if (!simple) {
		return items;
	}
	return items
		.map((item) => {
			const data = item.json;
			if (!data) {
				return;
			}

			const attributesArray = data.UserAttributes as IUserAttribute[];

			const userAttributes = Object.fromEntries(
				attributesArray
					.filter(({ Name }) => Name?.trim())
					.map(({ Name, Value }) => [Name, Value ?? '']),
			);
			const { UserAttributes, ...selectedData } = data;

			return { json: { ...selectedData, ...userAttributes } };
		})
		.filter(Boolean) as INodeExecutionData[];
}

export async function simplifyUsers(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const simple = this.getNodeParameter('simple') as boolean;
	if (!simple) {
		return items;
	}
	return items
		.map((item) => {
			const users = (item.json?.Users as IUser[]) ?? [];

			const processedUsers = users.map((user) => {
				const attributesArray = user.Attributes;
				const userAttributes = Object.fromEntries(
					attributesArray
						.filter(({ Name }) => Name?.trim())
						.map(({ Name, Value }) => [Name, Value ?? '']),
				);
				const { Attributes, ...selectedData } = user;

				return { ...selectedData, ...userAttributes };
			});

			return { json: { Users: processedUsers } };
		})
		.filter(Boolean) as INodeExecutionData[];
}

export async function preSendAttributes(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const operation = this.getNodeParameter('operation', 0) as string;

	const parameterName =
		operation === 'create'
			? 'additionalFields.userAttributes.attributes'
			: 'userAttributes.attributes';
	const attributes = this.getNodeParameter(parameterName, []) as IUserAttributeInput[];

	if (operation === 'update' && (!attributes || attributes.length === 0)) {
		throw new NodeOperationError(this.getNode(), 'No user attributes provided', {
			description: 'At least one user attribute must be provided for the update operation.',
		});
	}

	if (operation === 'create') {
		const hasEmail = attributes.some((a) => a.standardName === 'email');
		const hasEmailVerifiedTrue = attributes.some(
			(a) => a.standardName === 'email_verified' && a.value === 'true',
		);

		if (hasEmailVerifiedTrue && !hasEmail) {
			throw new NodeOperationError(this.getNode(), 'Missing required "email" attribute', {
				description:
					'"email_verified" is set to true, but the corresponding "email" attribute is not provided.',
			});
		}

		const hasPhone = attributes.some((a) => a.standardName === 'phone_number');
		const hasPhoneVerifiedTrue = attributes.some(
			(a) => a.standardName === 'phone_number_verified' && a.value === 'true',
		);

		if (hasPhoneVerifiedTrue && !hasPhone) {
			throw new NodeOperationError(this.getNode(), 'Missing required "phone_number" attribute', {
				description:
					'"phone_number_verified" is set to true, but the corresponding "phone_number" attribute is not provided.',
			});
		}
	}

	const body = jsonParse<IDataObject>(String(requestOptions.body), {
		acceptJSObject: true,
		errorMessage: 'Invalid request body. Request body must be valid JSON.',
	});

	body.UserAttributes = attributes.map(({ attributeType, standardName, customName, value }) => {
		if (!value || !attributeType || !(standardName ?? customName)) {
			throw new NodeOperationError(this.getNode(), 'Invalid User Attribute', {
				description: 'Each attribute must have a valid name and value.',
			});
		}

		const attributeName =
			attributeType === 'standard'
				? standardName
				: `custom:${customName?.startsWith('custom:') ? customName : customName}`;

		return { Name: attributeName, Value: value };
	});

	requestOptions.body = JSON.stringify(body);

	return requestOptions;
}

export async function preSendDesiredDeliveryMediums(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const desiredDeliveryMediums = this.getNodeParameter(
		'additionalFields.desiredDeliveryMediums',
		[],
	) as string[];

	const attributes = this.getNodeParameter(
		'additionalFields.userAttributes.attributes',
		[],
	) as IUserAttributeInput[];

	const hasEmail = attributes.some((attr) => attr.standardName === 'email' && !!attr.value?.trim());
	const hasPhone = attributes.some(
		(attr) => attr.standardName === 'phone_number' && !!attr.value?.trim(),
	);

	if (desiredDeliveryMediums.includes('EMAIL') && !hasEmail) {
		throw new NodeOperationError(this.getNode(), 'Missing required "email" attribute', {
			description: 'Email is selected as a delivery medium but no email attribute is provided.',
		});
	}

	if (desiredDeliveryMediums.includes('SMS') && !hasPhone) {
		throw new NodeOperationError(this.getNode(), 'Missing required "phone_number" attribute', {
			description:
				'SMS is selected as a delivery medium but no phone_number attribute is provided.',
		});
	}

	return requestOptions;
}
