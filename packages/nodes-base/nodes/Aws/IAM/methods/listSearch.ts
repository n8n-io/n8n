import {
	type IDataObject,
	type IExecuteSingleFunctions,
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
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const requestParams = paginationToken ? `&Marker=${paginationToken}` : '';

	const responseData = (await makeAwsRequest.call(this, {
		method: 'POST',
		url: `/?Action=ListUsers&Version=${CURRENT_VERSION}${requestParams}`,
	})) as GetAllUsersResponseBody;

	const users = responseData.ListUsersResponse.ListUsersResult.Users || [];

	const nextMarker = responseData.ListUsersResponse.ListUsersResult.IsTruncated
		? responseData.ListUsersResponse.ListUsersResult.Marker
		: undefined;

	return {
		results: formatResults(users, filter),
		paginationToken: nextMarker,
	};
}

export async function searchGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const requestParams = paginationToken ? `&Marker=${paginationToken}` : '';

	const responseData = (await makeAwsRequest.call(this, {
		method: 'POST',
		url: `/?Action=ListGroups&Version=${CURRENT_VERSION}${requestParams}`,
	})) as GetAllGroupsResponseBody;

	const groups = responseData.ListGroupsResponse.ListGroupsResult.Groups || [];

	const nextMarker = responseData.ListGroupsResponse.ListGroupsResult.IsTruncated
		? responseData.ListGroupsResponse.ListGroupsResult.Marker
		: undefined;

	return {
		results: formatResults(groups, filter),
		paginationToken: nextMarker,
	};
}

export async function searchGroupsForUser(
	this: ILoadOptionsFunctions | IExecuteSingleFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const userName = (this.getNodeParameter('user') as IDataObject).value as string;
	let requestParams = paginationToken ? `&Marker=${paginationToken}` : '';
	let allGroups: IDataObject[] = [];
	let nextMarker: string | undefined;

	do {
		const groupsData = (await makeAwsRequest.call(this, {
			method: 'POST',
			url: `/?Action=ListGroups&Version=${CURRENT_VERSION}${requestParams}`,
		})) as GetAllGroupsResponseBody;

		const groups = groupsData.ListGroupsResponse?.ListGroupsResult?.Groups || [];
		nextMarker = groupsData.ListGroupsResponse?.ListGroupsResult?.IsTruncated
			? groupsData.ListGroupsResponse?.ListGroupsResult?.Marker
			: undefined;

		allGroups = [...allGroups, ...groups];

		requestParams = nextMarker ? `&Marker=${nextMarker}` : '';
	} while (nextMarker);

	if (allGroups.length === 0) {
		return { results: [] };
	}

	const groupCheckPromises = allGroups.map(async (group) => {
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

	return {
		results: formatResults(validUserGroups, filter),
		paginationToken: nextMarker,
	};
}
