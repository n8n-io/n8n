import {
	ApplicationError,
	type IDataObject,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type INodeListSearchItems,
	type INodeListSearchResult,
} from 'n8n-workflow';

import type { IUserAttribute, IUserPool } from '../helpers/interfaces';
import { listUsersInGroup } from '../helpers/utils';
import { makeAwsRequest } from '../transport';

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
	const userPoolId = (this.getNodeParameter('userPoolId', '') as IDataObject)?.value as string;
	if (!userPoolId) {
		throw new ApplicationError('User Pool ID is required to search groups');
	}

	const responseData = await makeAwsRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
		body: JSON.stringify({ UserPoolId: userPoolId, MaxResults: 60, NextToken: paginationToken }),
	});

	const groups = responseData.Groups as IDataObject[];

	const formattedResults = formatResults(groups, filter);

	return { results: formattedResults, paginationToken: responseData.NextToken };
}

export async function searchGroupsForUser(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userName = (this.getNodeParameter('userName') as IDataObject).value as string;
	const userPoolId = (this.getNodeParameter('userPoolId', '') as IDataObject).value as string;

	const listGroupsOpts: IHttpRequestOptions = {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
		body: JSON.stringify({ UserPoolId: userPoolId, MaxResults: 60 }),
	};

	try {
		const responseData: IDataObject = await makeAwsRequest.call(this, listGroupsOpts);
		const groups = Array.isArray(responseData.Groups) ? responseData.Groups : [];

		if (!groups || groups.length === 0) return { results: [] };

		const isUserInGroup = async (groupName: string): Promise<boolean> => {
			const usersInGroup = await listUsersInGroup.call(this, groupName, userPoolId);
			const users =
				usersInGroup.results && Array.isArray(usersInGroup.results) ? usersInGroup.results : [];
			return users.some((user) => user.Username === userName);
		};

		const validUserGroups = await Promise.all(
			groups.map(async (group) => {
				const groupName = group.GroupName;
				if (groupName && (await isUserInGroup(groupName))) {
					return { name: groupName, value: groupName };
				}
				return null;
			}),
		);

		const filteredGroups: INodeListSearchItems[] = validUserGroups.filter(
			(group): group is INodeListSearchItems => group !== null,
		);

		const resultGroups = filteredGroups
			.filter((group) => !filter || group.name.toLowerCase().includes(filter.toLowerCase()))
			.sort((a, b) => a.name.localeCompare(b.name));

		return { results: resultGroups, paginationToken };
	} catch (error) {
		console.error('Error fetching groups:', error);
		return { results: [] };
	}
}

export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userPoolId = (this.getNodeParameter('userPoolId') as IDataObject).value as string;

	if (!userPoolId) {
		throw new ApplicationError('User Pool ID is required to search users');
	}

	const userPoolData = await makeAwsRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool' },
		body: JSON.stringify({ UserPoolId: userPoolId }),
	});

	const userPool = userPoolData.UserPool as IUserPool;

	if (!userPool || !Array.isArray(userPool.UsernameAttributes)) {
		throw new ApplicationError('Invalid user pool configuration');
	}

	const usernameAttributes = userPool.UsernameAttributes;

	const listUsersOpts: IHttpRequestOptions = {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers' },
		body: JSON.stringify({
			UserPoolId: userPoolId,
			MaxResults: 60,
			NextToken: paginationToken,
		}),
	};

	const responseData = await makeAwsRequest.call(this, listUsersOpts);

	const users = Array.isArray(responseData.Users) ? responseData.Users : [];

	if (!users.length) {
		return { results: [] };
	}

	const userResults = users.map((user) => {
		const attributes: IUserAttribute[] = user.Attributes || [];
		const username = user.Username;

		const email = attributes.find((attr) => attr.Name === 'email')?.Value ?? '';
		const phoneNumber = attributes.find((attr) => attr.Name === 'phone_number')?.Value ?? '';
		const sub = attributes.find((attr) => attr.Name === 'sub')?.Value ?? '';

		const name = usernameAttributes.includes('email')
			? email
			: usernameAttributes.includes('phone_number')
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
	const responseData = await makeAwsRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUserPools' },
		body: JSON.stringify({ MaxResults: 60, NextToken: paginationToken }),
	});

	const userPools = responseData.UserPools as IDataObject[];

	const userPoolsResults = userPools.map(({ Name, Id }) => ({
		id: Id,
		name: String(Name),
	}));

	return {
		results: formatResults(userPoolsResults, filter),
		paginationToken: responseData.NextToken,
	};
}
