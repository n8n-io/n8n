import {
	ApplicationError,
	type INodeListSearchItems,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeListSearchResult,
	NodeOperationError,
} from 'n8n-workflow';

import { makeAwsRequest } from './awsRequest';
import { getUserPoolConfigurationData, listUsersInGroup, searchUsersForGroup } from './helpers';

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

	const userPools = (responseData.UserPools as IDataObject[]) || [];

	const filterLower = filter?.toLowerCase();

	const results = userPools
		.map(({ Name, Id }) => ({
			name: String(Name),
			value: String(Id),
		}))
		.filter(
			({ name, value }) =>
				!filterLower ||
				name.toLowerCase().includes(filterLower) ||
				value.toLowerCase().includes(filterLower),
		)
		.sort((a, b) => a.name.localeCompare(b.name));

	return { results, paginationToken: responseData.NextToken };
}

interface IUserAttribute {
	Name: string;
	Value: string;
}

interface IUserPool {
	UsernameAttributes: string[];
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

	const opts: IHttpRequestOptions = {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListUsers' },
		body: JSON.stringify({
			UserPoolId: userPoolId,
			MaxResults: 60,
			NextToken: paginationToken,
		}),
	};

	const userPoolData: IDataObject = await getUserPoolConfigurationData.call(this, userPoolId);
	const userPool = userPoolData.UserPool as IUserPool;

	if (!(userPool && Array.isArray(userPool.UsernameAttributes))) {
		throw new ApplicationError('Invalid user pool configuration');
	}

	const usernameAttributes = userPool.UsernameAttributes;

	const responseData = await makeAwsRequest.call(this, opts);
	const users = responseData.Users;

	if (!Array.isArray(users)) {
		return { results: [] };
	}

	const results: INodeListSearchItems[] = users
		.map((user) => {
			const attributes: IUserAttribute[] = Array.isArray(user.Attributes) ? user.Attributes : [];
			const username = user.Username;

			const email = attributes.find((attr) => attr.Name === 'email')?.Value ?? '';
			const phoneNumber = attributes.find((attr) => attr.Name === 'phone_number')?.Value ?? '';
			const sub = attributes.find((attr) => attr.Name === 'sub')?.Value ?? '';

			const name = usernameAttributes.includes('email')
				? email
				: usernameAttributes.includes('phone_number')
					? phoneNumber
					: username;

			return { name, value: sub };
		})
		.filter((user) => {
			if (!filter) return true;
			return (
				user.name.toLowerCase().includes(filter.toLowerCase()) ||
				user.value.toLowerCase().includes(filter.toLowerCase())
			);
		})
		.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

	return { results, paginationToken: responseData.NextToken };
}

export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const userPoolId = (this.getNodeParameter('userPoolId') as IDataObject).value as string;
	const include = this.getNodeParameter('includeUsers');
	let body;
	if (typeof response.body === 'string') {
		try {
			body = JSON.parse(response.body);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Failed to parse response body');
		}
	} else if (response.body) {
		body = response.body;
	}

	if (!include) {
		return body.Group ? [{ json: body.Group }] : items;
	}

	const processedGroups: IDataObject[] = [];

	if (body.Group) {
		const group = body.Group;
		const users = await listUsersInGroup.call(this, group.groupName, userPoolId);

		const usersResponse = users.results && Array.isArray(users.results) ? users.results : [];

		return [{ json: { ...group, Users: usersResponse.length ? usersResponse : [] } }];
	}

	const groups = body.Groups || [];
	for (const group of groups) {
		const usersResponse = await searchUsersForGroup.call(this, group.GroupName, userPoolId);
		processedGroups.push({
			...group,
			Users: usersResponse.length ? usersResponse : [],
		});
	}

	return items.map((item) => ({ json: { ...item.json, Groups: processedGroups } }));
}

export async function searchGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userPoolId = (this.getNodeParameter('userPoolId', '') as IDataObject).value as string;

	if (!userPoolId) {
		throw new ApplicationError('User Pool ID is required to search groups');
	}

	const opts: IHttpRequestOptions = {
		url: '',
		method: 'POST',
		headers: { 'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups' },
		body: JSON.stringify({
			UserPoolId: userPoolId,
			MaxResults: 60,
			NextToken: paginationToken,
		}),
	};

	const responseData: IDataObject = await makeAwsRequest.call(this, opts);
	const groups = responseData.Groups as IDataObject[];

	if (!groups) return { results: [] };

	const results: INodeListSearchItems[] = groups
		.filter((group) => group.GroupName)
		.map((group) => ({
			name: String(group.GroupName),
			value: String(group.GroupName),
		}))
		.filter(
			(group) =>
				!filter ||
				String(group.name).toLowerCase().includes(filter.toLowerCase()) ||
				String(group.value).toLowerCase().includes(filter.toLowerCase()),
		)
		.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

	return { results, paginationToken: responseData.NextToken };
}

export async function searchGroupsForUser(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userName = (this.getNodeParameter('userName') as IDataObject).value as string;
	const userPoolId = (this.getNodeParameter('userPoolId', '') as IDataObject).value as string;

	if (!userName || !userPoolId) {
		console.warn('⚠️ Missing required parameters: User or User Pool');
		return { results: [] };
	}

	const listGroupsOpts: IHttpRequestOptions = {
		url: '',
		method: 'POST',
		headers: {
			'X-Amz-Target': 'AWSCognitoIdentityProviderService.ListGroups',
		},
		body: JSON.stringify({
			UserPoolId: userPoolId,
			MaxResults: 60,
		}),
	};

	const responseData: IDataObject = await makeAwsRequest.call(this, listGroupsOpts);
	const groups = Array.isArray(responseData.Groups) ? responseData.Groups : [];

	if (!groups.length) return { results: [] };

	const groupCheckPromises = groups.map(async (group) => {
		const groupName = group.GroupName;
		if (!groupName) return null;

		const usersInGroup = await searchUsersForGroup.call(this, groupName, userPoolId);
		const isUserInGroupFlag = usersInGroup.some((user) => user.Username === userName);

		return isUserInGroupFlag ? { name: groupName, value: groupName } : null;
	});

	const resolvedResults = await Promise.all(groupCheckPromises);
	const validUserGroups = resolvedResults.filter(Boolean) as INodeListSearchItems[];

	const filteredGroups = validUserGroups
		.filter((group) => !filter || group.name.toLowerCase().includes(filter.toLowerCase()))
		.sort((a, b) => a.name.localeCompare(b.name));

	return { results: filteredGroups, paginationToken };
}
