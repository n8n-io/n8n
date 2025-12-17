import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { CURRENT_VERSION } from '../helpers/constants';
import type {
	GetAllGroupsResponseBody,
	GetAllUsersResponseBody,
	GetGroupResponseBody,
} from '../helpers/types';
import { awsApiRequest } from '../transport';

function formatSearchResults(
	items: IDataObject[],
	propertyName: string,
	filter?: string,
): INodeListSearchItems[] {
	return items
		.map((item) => ({
			name: String(item[propertyName] ?? ''),
			value: String(item[propertyName] ?? ''),
		}))
		.filter(({ name }) => !filter || name.includes(filter))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: '',
		body: {
			Action: 'ListUsers',
			Version: CURRENT_VERSION,
			...(paginationToken ? { Marker: paginationToken } : {}),
		},
	};
	const responseData = (await awsApiRequest.call(this, options)) as GetAllUsersResponseBody;

	const users = responseData.ListUsersResponse.ListUsersResult.Users || [];
	const nextMarker = responseData.ListUsersResponse.ListUsersResult.IsTruncated
		? responseData.ListUsersResponse.ListUsersResult.Marker
		: undefined;

	return {
		results: formatSearchResults(users, 'UserName', filter),
		paginationToken: nextMarker,
	};
}

export async function searchGroups(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: '',
		body: {
			Action: 'ListGroups',
			Version: CURRENT_VERSION,
			...(paginationToken ? { Marker: paginationToken } : {}),
		},
	};

	const responseData = (await awsApiRequest.call(this, options)) as GetAllGroupsResponseBody;

	const groups = responseData.ListGroupsResponse.ListGroupsResult.Groups || [];
	const nextMarker = responseData.ListGroupsResponse.ListGroupsResult.IsTruncated
		? responseData.ListGroupsResponse.ListGroupsResult.Marker
		: undefined;

	return {
		results: formatSearchResults(groups, 'GroupName', filter),
		paginationToken: nextMarker,
	};
}

export async function searchGroupsForUser(
	this: ILoadOptionsFunctions | IExecuteSingleFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const userName = this.getNodeParameter('user', undefined, { extractValue: true });
	let allGroups: IDataObject[] = [];
	let nextMarkerGroups: string | undefined;
	do {
		const options: IHttpRequestOptions = {
			method: 'POST',
			url: '',
			body: {
				Action: 'ListGroups',
				Version: CURRENT_VERSION,
				...(nextMarkerGroups ? { Marker: nextMarkerGroups } : {}),
			},
		};

		const groupsData = (await awsApiRequest.call(this, options)) as GetAllGroupsResponseBody;

		const groups = groupsData.ListGroupsResponse?.ListGroupsResult?.Groups || [];
		nextMarkerGroups = groupsData.ListGroupsResponse?.ListGroupsResult?.IsTruncated
			? groupsData.ListGroupsResponse?.ListGroupsResult?.Marker
			: undefined;

		allGroups = [...allGroups, ...groups];
	} while (nextMarkerGroups);

	if (allGroups.length === 0) {
		return { results: [] };
	}

	const groupCheckPromises = allGroups.map(async (group) => {
		const groupName = group.GroupName as string;
		if (!groupName) {
			return null;
		}

		try {
			const options: IHttpRequestOptions = {
				method: 'POST',
				url: '',
				body: {
					Action: 'GetGroup',
					Version: CURRENT_VERSION,
					GroupName: groupName,
				},
			};

			const getGroupResponse = (await awsApiRequest.call(this, options)) as GetGroupResponseBody;
			const groupResult = getGroupResponse?.GetGroupResponse?.GetGroupResult;
			const userExists = groupResult?.Users?.some((user) => user.UserName === userName);

			if (userExists) {
				return { UserName: userName, GroupName: groupName };
			}
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: `Failed to get group ${groupName}: ${error?.message ?? 'Unknown error'}`,
			});
		}

		return null;
	});

	const validUserGroups = (await Promise.all(groupCheckPromises)).filter(Boolean) as IDataObject[];

	return {
		results: formatSearchResults(validUserGroups, 'GroupName', filter),
	};
}
