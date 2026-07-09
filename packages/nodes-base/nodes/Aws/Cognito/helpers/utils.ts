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
	IGroupWithUserResponse,
	IListGroupsResponse,
	IUser,
	IUserAttribute,
	IUserAttributeInput,
	IUserPool,
} from './interfaces';
import { awsApiRequest, awsApiRequestAllItems } from '../transport';

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

	const response = (await awsApiRequest.call(
		this,
		'POST',
		'DescribeUserPool',
		JSON.stringify({ UserPoolId: userPoolId }),
	)) as { UserPool: IUserPool };

	if (!response?.UserPool) {
		throw new NodeOperationError(this.getNode(), 'User Pool not found in response');
	}

	return response.UserPool;
}

export async function getUsersInGroup(
	this: IExecuteSingleFunctions | ILoadOptionsFunctions,
	groupName: string,
	userPoolId: string,
): Promise<IUser[]> {
	if (!userPoolId) {
		throw new NodeOperationError(this.getNode(), 'User Pool ID is required');
	}

	const requestBody: IDataObject = {
		UserPoolId: userPoolId,
		GroupName: groupName,
	};

	const allUsers = (await awsApiRequestAllItems.call(
		this,
		'POST',
		'ListUsersInGroup',
		requestBody,
		'Users',
	)) as unknown as IUser[];

	return allUsers;
}

export async function getUserNameFromExistingUsers(
	this: IExecuteSingleFunctions | ILoadOptionsFunctions,
	userName: string,
	userPoolId: string,
	isEmailOrPhone: boolean,
): Promise<string | undefined> {
	if (isEmailOrPhone) {
		return userName;
	}

	const usersResponse = (await awsApiRequest.call(
		this,
		'POST',
		'ListUsers',
		JSON.stringify({
			UserPoolId: userPoolId,
			Filter: `sub = "${userName}"`,
		}),
	)) as { Users: IUser[] };

	const username =
		usersResponse.Users && usersResponse.Users.length > 0
			? usersResponse.Users[0].Username
			: undefined;

	return username;
}

export async function preSendUserFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const operation = this.getNodeParameter('operation') as string;
	const userPoolId = this.getNodeParameter('userPool', undefined, {
		extractValue: true,
	}) as string;

	const userPool = await getUserPool.call(this, userPoolId);

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

	const finalUserName =
		operation === 'create'
			? getValidatedNewUserName()
			: await getUserNameFromExistingUsers.call(
					this,
					this.getNodeParameter('user', undefined, { extractValue: true }) as string,
					userPoolId,
					isEmailOrPhone,
				);

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

export async function processGroup(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const userPoolId = this.getNodeParameter('userPool', undefined, {
		extractValue: true,
	}) as string;
	const includeUsers = this.getNodeParameter('includeUsers') as boolean;
	const body = response.body as IDataObject;

	if (body.Group) {
		const group = body.Group as IGroup;

		if (!includeUsers) {
			return this.helpers.returnJsonArray({ ...group });
		}

		const users = await getUsersInGroup.call(this, group.GroupName, userPoolId);
		return this.helpers.returnJsonArray({ ...group, Users: users });
	}

	const groups = (response.body as IListGroupsResponse).Groups ?? [];

	if (!includeUsers) {
		return items;
	}

	const processedGroups: IGroupWithUserResponse[] = [];
	for (const group of groups) {
		const users = await getUsersInGroup.call(this, group.GroupName, userPoolId);
		processedGroups.push({
			...group,
			Users: users,
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

			if (Array.isArray(data.Users)) {
				const users = data.Users as IUser[];

				const simplifiedUsers = users.map((user) => {
					const attributesArray = user.Attributes ?? [];

					const userAttributes = Object.fromEntries(
						attributesArray
							.filter(({ Name }) => Name?.trim())
							.map(({ Name, Value }) => [Name, Value ?? '']),
					);

					const { Attributes, ...rest } = user;
					return { ...rest, ...userAttributes };
				});

				return { json: { ...data, Users: simplifiedUsers } };
			}

			if (Array.isArray(data.UserAttributes)) {
				const attributesArray = data.UserAttributes as IUserAttribute[];

				const userAttributes = Object.fromEntries(
					attributesArray
						.filter(({ Name }) => Name?.trim())
						.map(({ Name, Value }) => [Name, Value ?? '']),
				);

				const { UserAttributes, ...rest } = data;
				return { json: { ...rest, ...userAttributes } };
			}

			return item;
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
		const hasEmailVerified = attributes.some(
			(a) => a.standardName === 'email_verified' && a.value === 'true',
		);

		if (hasEmailVerified && !hasEmail) {
			throw new NodeOperationError(this.getNode(), 'Missing required "email" attribute', {
				description:
					'"email_verified" is set to true, but the corresponding "email" attribute is not provided.',
			});
		}

		const hasPhone = attributes.some((a) => a.standardName === 'phone_number');
		const hasPhoneVerified = attributes.some(
			(a) => a.standardName === 'phone_number_verified' && a.value === 'true',
		);

		if (hasPhoneVerified && !hasPhone) {
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
