import {
	ApplicationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
} from 'n8n-workflow';

import { makeAwsRequest } from './makeAwsRequest';

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

export function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function validatePhoneNumber(phoneNumber: string): boolean {
	const phoneRegex = /^\+[0-9]\d{1,14}$/;
	return phoneRegex.test(phoneNumber);
}

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

export async function searchUsersForGroup(
	this: IExecuteSingleFunctions | ILoadOptionsFunctions,
	groupName: string,
	userPoolId: string,
): Promise<IDataObject[]> {
	const users = await listUsersInGroup.call(this, groupName, userPoolId);

	return (users.results && Array.isArray(users.results) ? users.results : []) as IDataObject[];
}
