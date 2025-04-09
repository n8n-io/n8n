import type {
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { jsonParse, NodeApiError, NodeOperationError, OperationalError } from 'n8n-workflow';

import type { IUserPool } from './interfaces';
import { searchUsersForGroup } from './searchFunctions';
import { searchUsers } from '../methods/listSearch';
import { awsApiRequest } from '../transport';

const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhoneNumber = (phone: string): boolean => /^\+[0-9]\d{1,14}$/.test(phone);

export function parseRequestBody(body: unknown): IDataObject {
	if (typeof body === 'string') {
		try {
			return jsonParse(body);
		} catch {
			throw new OperationalError('Failed to parse request body: Invalid JSON format.');
		}
	}

	if (body && typeof body === 'object') {
		return body as IDataObject;
	}

	throw new OperationalError(
		`Invalid request body type: Expected string or object, received ${typeof body}`,
	);
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
	})) as unknown as IUserPool;

	if (!response?.UserPool) {
		throw new NodeOperationError(this.getNode(), 'User Pool not found in response');
	}

	return response;
}

export async function preSendUserFields(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
	_paginationToken?: string,
): Promise<IHttpRequestOptions> {
	const operation = this.getNodeParameter('operation') as string;
	const userPoolId = this.getNodeParameter('userPool', undefined, {
		extractValue: true,
	}) as string;

	const userPool = (await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool' },
		body: JSON.stringify({ UserPoolId: userPoolId }),
	})) as unknown as IUserPool;
	const usernameAttributes = userPool?.UserPool.UsernameAttributes ?? [];
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

		const { results: users } = await searchUsers.call(this as unknown as ILoadOptionsFunctions);

		const matchedUser = users?.find((user) => user.value === userName);

		return isEmailOrPhone ? userName : matchedUser?.name;
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

export async function processGroupResponse(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const userPoolId = this.getNodeParameter('userPool', undefined, {
		extractValue: true,
	}) as string;
	const include = this.getNodeParameter('includeUsers') as boolean;
	const body = parseRequestBody(response.body);

	if (!include) {
		return [{ json: body.Group as IDataObject }];
	}

	const group = body.Group as IDataObject;
	const users = await searchUsersForGroup.call(this, group.GroupName as string, userPoolId);

	return [{ json: { ...group, Users: users.results ?? [] } }];
}

export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const userPoolId = this.getNodeParameter('userPool', undefined, {
		extractValue: true,
	}) as string;
	const include = this.getNodeParameter('includeUsers') as boolean;
	const body = parseRequestBody(response.body);

	if (!include) {
		return items;
	}

	const processedGroups: IDataObject[] = [];
	const groups = Array.isArray(body?.Groups) ? body.Groups : [];
	for (const group of groups) {
		const usersResponse = await searchUsersForGroup.call(
			this,
			group.GroupName as string,
			userPoolId,
		);
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
	if (!simple) return items;
	return items
		.map((item) => {
			const data = item.json?.UserPool as IDataObject | undefined;
			if (!data) return undefined;

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
	if (!simple) return items;
	return items
		.map((item) => {
			const userData = item.json as IDataObject | undefined;
			if (!userData) return undefined;

			const attributesArray = Array.isArray(userData.UserAttributes) ? userData.UserAttributes : [];

			const userAttributes = Object.fromEntries(
				(attributesArray ?? [])
					.filter(({ Name }) => Name?.trim())
					.map(({ Name, Value }) => [Name, Value ?? '']),
			);
			const { UserAttributes, ...selectedData } = userData;

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
	if (!simple) return items;
	return items
		.map((item) => {
			const users = item.json?.Users as IDataObject[] | undefined;
			if (!users) return undefined;

			const processedUsers = users.map((user) => {
				const attributesArray = Array.isArray(user.Attributes) ? user.Attributes : [];
				const userAttributes = Object.fromEntries(
					(attributesArray ?? [])
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
