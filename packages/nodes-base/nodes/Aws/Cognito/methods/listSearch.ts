import type {
	IDataObject,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { IGroup, IUser, IUserAttribute, IUserPool } from '../helpers/interfaces';
// eslint-disable-next-line import/no-cycle
import { searchUsersForGroup } from '../helpers/utils';
import { awsApiRequest } from '../transport';

function formatResults(items: IDataObject[], filter?: string): INodeListSearchItems[] {
	return items
		.map(({ id, name }) => ({
			name: String(name).replace(/ /g, ''),
			value: String(id),
		}))
		.filter(({ name }) => !filter || name.toLowerCase().includes(filter.toLowerCase()))
		.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

export async function searchGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userPoolId = this.getNodeParameter('userPool', undefined, {
		extractValue: true,
	}) as string;
	if (!userPoolId) {
		throw new NodeOperationError(this.getNode(), 'User Pool ID is required to search groups');
	}

	const responseData = (await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
		body: JSON.stringify({ UserPoolId: userPoolId, Limit: 50, NextToken: paginationToken }),
	})) as IDataObject;

	const groups = responseData.Groups as IDataObject[];

	const groupsMapped = groups.map(({ GroupName }) => ({
		id: GroupName,
		name: GroupName,
	}));

	const formattedResults = formatResults(groupsMapped, filter);

	return { results: formattedResults, paginationToken: responseData.NextToken };
}

export async function searchGroupsForUser(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userName = this.getNodeParameter('user', undefined, {
		extractValue: true,
	}) as string;
	const userPoolId = this.getNodeParameter('userPool', undefined, {
		extractValue: true,
	}) as string;

	try {
		const responseData = (await awsApiRequest.call(this, {
			url: '',
			method: 'POST',
			headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
			body: JSON.stringify({ UserPoolId: userPoolId, Limit: 50 }),
		})) as IDataObject;
		const groups = responseData.Groups as IGroup[];

		if (!groups || groups.length === 0) {
			return { results: [] };
		}
		const isUserInGroup = async (groupName: string): Promise<boolean> => {
			const usersInGroup = await searchUsersForGroup.call(this, groupName, userPoolId);

			const users =
				usersInGroup.results && Array.isArray(usersInGroup.results) ? usersInGroup.results : [];
			return users.some((user: IUser) => user.Username === userName);
		};

		const validUserGroups = (
			await Promise.all(
				groups.map(async (group) => {
					const groupName = group.GroupName;
					if (groupName && (await isUserInGroup(groupName))) {
						return { name: groupName, value: groupName };
					}
					return null;
				}),
			)
		).filter((group) => group !== null);

		const resultGroups = validUserGroups
			.filter((group) => !filter || group.name.toLowerCase().includes(filter.toLowerCase()))
			.sort((a, b) => a.name.localeCompare(b.name));

		return { results: resultGroups, paginationToken };
	} catch (error) {
		return { results: [] };
	}
}

export async function searchUsers(
	this: IExecuteSingleFunctions | ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userPoolId = this.getNodeParameter('userPool', undefined, { extractValue: true }) as string;

	if (!userPoolId) {
		throw new NodeOperationError(this.getNode(), 'User Pool ID is required to search users');
	}

	const userPoolData = (await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool' },
		body: JSON.stringify({ UserPoolId: userPoolId }),
	})) as IDataObject;

	const userPool = userPoolData.UserPool as IUserPool;
	const usernameAttributes = userPool.UsernameAttributes;

	const responseData = (await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers' },
		body: JSON.stringify({
			UserPoolId: userPoolId,
			Limit: 50,
			NextToken: paginationToken,
		}),
	})) as IDataObject;

	const users = responseData.Users as IUser[];

	if (!users.length) {
		return { results: [] };
	}

	const userResults = users.map((user) => {
		const attributes: IUserAttribute[] = user.Attributes ?? [];
		const username = user.Username;

		const email = attributes.find((attr) => attr.Name === 'email')?.Value ?? '';
		const phoneNumber = attributes.find((attr) => attr.Name === 'phone_number')?.Value ?? '';
		const sub = attributes.find((attr) => attr.Name === 'sub')?.Value ?? '';

		const name = usernameAttributes?.includes('email')
			? email
			: usernameAttributes?.includes('phone_number')
				? phoneNumber
				: username;

		return { id: sub, name, value: sub };
	});

	return { results: formatResults(userResults, filter), paginationToken: responseData.NextToken };
}

export async function searchUserPools(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const responseData = (await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUserPools' },
		body: JSON.stringify({ Limit: 50, NextToken: paginationToken }),
	})) as IDataObject;

	const userPools = responseData.UserPools as IUserPool[];

	const userPoolsMapped = userPools.map((userPool) => ({
		id: userPool.Id,
		name: userPool.Name,
	}));

	const formattedResults = formatResults(userPoolsMapped, filter);

	return { results: formattedResults, paginationToken: responseData.NextToken };
}
