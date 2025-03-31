import {
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type INodeListSearchItems,
	type INodeListSearchResult,
} from 'n8n-workflow';

import { CURRENT_VERSION } from '../helpers/constants';
import type {
	GetAllGroupsResponseBody,
	GetAllUsersResponseBody,
	GetGroupResponseBody,
} from '../helpers/types';
import { makeAwsRequest } from '../transport';

function formatResults(items: IDataObject[], filter?: string): INodeListSearchItems[] {
	return items
		.map((item) => ({
			name: String(item.GroupName ?? item.UserName ?? ''),
			value: String(item.GroupName ?? item.UserName ?? ''),
		}))
		.filter(({ name }) => !filter || name.includes(filter))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const opts: IHttpRequestOptions = {
		method: 'POST',
		url: `/?Action=ListUsers&Version=${CURRENT_VERSION}`,
	};

	const responseData = (await makeAwsRequest.call(this, opts)) as GetAllUsersResponseBody;
	const users = responseData.ListUsersResponse.ListUsersResult.Users;

	if (!users) {
		return { results: [] };
	}

	const results = formatResults(users, filter);
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
		url: `/?Action=ListGroups&Version=${CURRENT_VERSION}`,
	};

	const responseData = (await makeAwsRequest.call(this, opts)) as GetAllGroupsResponseBody;
	const groups = responseData.ListGroupsResponse.ListGroupsResult.Groups;

	if (!groups) {
		return { results: [] };
	}

	const results = formatResults(groups, filter);

	return {
		results,
	};
}

export async function searchGroupsForUser(
	this: ILoadOptionsFunctions | IExecuteSingleFunctions,
	filter?: string,
	_paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userName = (this.getNodeParameter('user') as IDataObject).value as string;
	const groupsData = (await makeAwsRequest.call(this, {
		method: 'POST',
		url: `/?Action=ListGroups&Version=${CURRENT_VERSION}`,
	})) as GetAllGroupsResponseBody;

	const groups = groupsData.ListGroupsResponse?.ListGroupsResult?.Groups;

	if (!groups || groups.length === 0) {
		return { results: [] };
	}

	const groupCheckPromises = groups.map(async (group) => {
		const groupName = group.GroupName as string;
		if (!groupName) return null;

		try {
			const getGroupResponse = (await makeAwsRequest.call(this, {
				method: 'POST',
				url: `/?Action=GetGroup&Version=${CURRENT_VERSION}&GroupName=${groupName}`,
			})) as GetGroupResponseBody;

			const groupResult = getGroupResponse.GetGroupResponse?.GetGroupResult;

			if (groupResult?.Users?.some((user) => user.UserName === userName)) {
				return { UserName: userName, GroupName: groupName };
			}
		} catch (error) {}

		return null;
	});

	const validUserGroups = (await Promise.all(groupCheckPromises)).filter(Boolean) as IDataObject[];

	const formattedResults = formatResults(validUserGroups, filter);

	return {
		results: formattedResults,
	};
}
