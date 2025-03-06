import {
	ApplicationError,
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type INodeListSearchItems,
	type INodeListSearchResult,
} from 'n8n-workflow';
import { makeAwsRequest } from './awsRequest';
import type {
	GetAllGroupsResponseBody,
	GetAllUsersResponseBody,
	GetGroupResponseBody,
} from './types';

export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const opts: IHttpRequestOptions = {
		method: 'POST',
		url: '/?Action=ListUsers&Version=2010-05-08',
	};

	const responseData: IDataObject = await makeAwsRequest.call(this, opts);

	const responseBody = responseData as GetAllUsersResponseBody;
	const users = responseBody.ListUsersResponse.ListUsersResult.Users;

	if (!users) {
		return { results: [] };
	}

	const results: INodeListSearchItems[] = users
		.map((user) => ({
			name: String(user.UserName),
			value: String(user.UserName),
		}))
		.filter((user) => !filter || user.name.includes(filter))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		results,
	};
}

export async function searchGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const opts: IHttpRequestOptions = {
		method: 'POST',
		url: '/?Action=ListGroups&Version=2010-05-08',
		headers: {
			'Cache-Control': 'no-cache',
			Pragma: 'no-cache',
		},
	};

	const responseData: IDataObject = await makeAwsRequest.call(this, opts);

	const responseBody = responseData as GetAllGroupsResponseBody;
	const groups = responseBody.ListGroupsResponse.ListGroupsResult.Groups;

	if (!groups) {
		return { results: [] };
	}

	const results: INodeListSearchItems[] = groups
		.map((group) => ({
			name: String(group.GroupName),
			value: String(group.GroupName),
		}))
		.filter((group) => !filter || group.name.includes(filter))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		results,
	};
}

export async function listGroups(
	this: ILoadOptionsFunctions | IExecuteSingleFunctions,
): Promise<IDataObject[]> {
	const listGroupsOpts: IHttpRequestOptions = {
		method: 'POST',
		url: '/?Action=ListGroups&Version=2010-05-08',
	};

	const responseData: IDataObject = await makeAwsRequest.call(this, listGroupsOpts);

	const responseBody = responseData as GetAllGroupsResponseBody;

	const groups = responseBody.ListGroupsResponse?.ListGroupsResult?.Groups;

	return groups || [];
}

export async function searchUsersForGroup(
	this: IExecuteSingleFunctions,
	groupName: string,
): Promise<IDataObject[]> {
	if (!groupName) {
		throw new ApplicationError('Group name is required to fetch users.');
	}

	const getGroupOpts: IHttpRequestOptions = {
		method: 'POST',
		url: `/?Action=GetGroup&Version=2010-05-08&GroupName=${groupName}`,
	};

	const responseData: IDataObject = await makeAwsRequest.call(this, getGroupOpts);

	const responseBody = responseData as GetGroupResponseBody;

	const users = responseBody?.GetGroupResponse?.GetGroupResult?.Users ?? [];

	return Array.isArray(users) ? users : [];
}

export async function isUserInGroup(
	this: ILoadOptionsFunctions | IExecuteSingleFunctions,
	groupName: string,
	userName: string,
): Promise<boolean> {
	const getGroupOpts: IHttpRequestOptions = {
		method: 'POST',
		url: `/?Action=GetGroup&Version=2010-05-08&GroupName=${groupName}`,
	};

	const getGroupResponse: IDataObject = await makeAwsRequest.call(this, getGroupOpts);
	const responseBody = getGroupResponse as GetGroupResponseBody;
	const groupResult = responseBody.GetGroupResponse?.GetGroupResult;

	if (!groupResult) {
		return false;
	}

	const usersInGroup = groupResult.Users as IDataObject[];

	if (!usersInGroup || usersInGroup.length === 0) {
		return false;
	}

	return usersInGroup.some((user) => user.UserName === userName);
}

export async function searchGroupsForUser(
	this: ILoadOptionsFunctions | IExecuteSingleFunctions,
	filter?: string,
	_paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userName = (this.getNodeParameter('userName') as IDataObject).value;
	const groups = await listGroups.call(this);

	if (!groups || groups.length === 0) {
		return { results: [] };
	}

	const groupCheckPromises = groups.map(async (group) => {
		const groupName = group.GroupName;

		if (!groupName) {
			return null;
		}

		const isUserInGroupFlag = await isUserInGroup.call(
			this,
			groupName as string,
			userName as string,
		);
		if (isUserInGroupFlag) {
			return { name: groupName, value: groupName };
		}

		return null;
	});

	const results = await Promise.all(groupCheckPromises);

	const validUserGroups = results.filter((group) => group !== null) as INodeListSearchItems[];

	const filteredGroups = validUserGroups
		.filter((group) => !filter || group.name.includes(filter))
		.sort((a, b) => a.name.localeCompare(b.name));

	return {
		results: filteredGroups,
	};
}

export async function removeUserFromGroups(
	this: ILoadOptionsFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const userName = (this.getNodeParameter('userName') as IDataObject).value as string;
	const userGroups = await searchGroupsForUser.call(this, userName);

	for (const group of userGroups.results) {
		const groupName = group.value;

		const removeUserOpts: IHttpRequestOptions = {
			method: 'POST',
			url: `/?Action=RemoveUserFromGroup&Version=2010-05-08&GroupName=${groupName}&UserName=${userName}`,
		};

		await makeAwsRequest.call(this, removeUserOpts);
	}

	return requestOptions;
}

export async function preDeleteUser(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const userName = (this.getNodeParameter('userName') as IDataObject).value as string;

	if (!userName) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'User is required',
				description: 'You must provide a valid User to delete.',
			},
		);
	}

	const groupsResult = await searchGroupsForUser.call(this);
	const groups = groupsResult.results.map((group) => group.value);

	if (!groups || groups.length === 0) {
		return requestOptions;
	}

	for (const groupName of groups) {
		const removeOpts: IHttpRequestOptions = {
			method: 'POST',
			url: `/?Action=RemoveUserFromGroup&GroupName=${groupName}&UserName=${userName}&Version=2010-05-08`,
			ignoreHttpStatusErrors: true,
		};

		await makeAwsRequest.call(this as unknown as ILoadOptionsFunctions, removeOpts);
	}

	return requestOptions;
}

export async function preDeleteGroup(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const groupName = (this.getNodeParameter('groupName') as IDataObject).value as string;

	if (!groupName) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Group is required',
				description: 'You must provide a valid Group to delete.',
			},
		);
	}

	const users = await searchUsersForGroup.call(this, groupName);
	const userNames = users.map((user) => user.UserName as string);

	if (!userNames.length) {
		return requestOptions;
	}

	for (const userName of userNames) {
		const removeUserOpts: IHttpRequestOptions = {
			method: 'POST',
			url: `/?Action=RemoveUserFromGroup&GroupName=${groupName}&UserName=${userName}&Version=2010-05-08`,
			ignoreHttpStatusErrors: true,
		};

		try {
			await makeAwsRequest.call(this as unknown as ILoadOptionsFunctions, removeUserOpts);
		} catch (error) {
			console.error(`⚠️ Failed to remove user "${userName}" from "${groupName}":`, error);
		}
	}

	return requestOptions;
}
