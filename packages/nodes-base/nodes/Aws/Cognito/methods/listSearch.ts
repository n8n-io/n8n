import type {
	IDataObject,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { IUserAttribute, IUserPool } from '../helpers/interfaces';
import { searchUsersForGroup } from '../helpers/searchFunctions';
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

	const responseData = await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
		body: JSON.stringify({ UserPoolId: userPoolId, MaxResults: 60, NextToken: paginationToken }),
	});

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

	const listGroupsOpts: IHttpRequestOptions = {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
		body: JSON.stringify({ UserPoolId: userPoolId, MaxResults: 60 }),
	};

	try {
		const responseData: IDataObject = await awsApiRequest.call(this, listGroupsOpts);
		const groups = Array.isArray(responseData.Groups) ? responseData.Groups : [];

		if (!groups || groups.length === 0) return { results: [], paginationToken: undefined };

		const isUserInGroup = async (groupName: string): Promise<boolean> => {
			const usersInGroup = await searchUsersForGroup.call(this, groupName, userPoolId);
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

		return { results: resultGroups, paginationToken: paginationToken ?? undefined };
	} catch (error) {
		return { results: [], paginationToken: undefined };
	}
}

export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userPoolId = (this.getNodeParameter('userPool') as IDataObject).value as string;

	if (!userPoolId) {
		throw new NodeOperationError(this.getNode(), 'User Pool ID is required to search users');
	}

	const userPoolData = (await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.DescribeUserPool' },
		body: JSON.stringify({ UserPoolId: userPoolId }),
	})) as unknown as IUserPool;

	const userPool = userPoolData.UserPool;

	const usernameAttributes = Array.isArray(userPool?.UsernameAttributes)
		? userPool.UsernameAttributes
		: [];

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

	const responseData = await awsApiRequest.call(this, listUsersOpts);

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
	const responseData = await awsApiRequest.call(this, {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUserPools' },
		body: JSON.stringify({ MaxResults: 60, NextToken: paginationToken }),
	});

	const userPools = responseData.UserPools as IDataObject[];

	const userPoolsMapped = userPools.map(({ Name, Id }) => ({
		id: Id,
		name: Name,
	}));

	const formattedResults = formatResults(userPoolsMapped, filter);

	return { results: formattedResults, paginationToken: responseData.NextToken };
}
