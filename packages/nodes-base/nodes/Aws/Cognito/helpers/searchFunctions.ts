import type { IDataObject, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { IUser, IUserAttribute } from './interfaces';
import { awsApiRequest } from '../transport';

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
		MaxResults: 60,
	};

	if (paginationToken) {
		requestBody.NextToken = paginationToken;
	}

	const responseData: IDataObject = await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: {
			'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsersInGroup',
		},
		body: JSON.stringify(requestBody),
	});

	const users = Array.isArray(responseData.Users) ? responseData.Users : [];

	if (users.length === 0) {
		return { results: [] };
	}

	const results = users
		.map(
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
						.filter(({ Name }: IUserAttribute) => Name?.trim())
						.map(({ Name, Value }: IUserAttribute) => [Name, Value ?? '']),
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
		)
		.sort((a, b) => a.Username.toLowerCase().localeCompare(b.Username.toLowerCase()));

	return {
		results,
		paginationToken: responseData.NextToken ?? undefined,
	};
}
