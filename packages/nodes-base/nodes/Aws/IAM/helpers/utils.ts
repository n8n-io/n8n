import {
	type IHttpRequestOptions,
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
} from 'n8n-workflow';

import { CURRENT_VERSION } from './constants';
import type {
	GetAllGroupsResponseBody,
	GetAllUsersResponseBody,
	GetGroupResponseBody,
	GetUserResponseBody,
} from './types';
import { searchGroupsForUser } from '../methods/listSearch';
import { makeAwsRequest } from '../transport';

//IMPROVED
export async function presendStringifyBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	if (requestOptions.body) {
		requestOptions.body = JSON.stringify(requestOptions.body);
	}
	return requestOptions;
}

export async function searchUsersForGroup(
	this: IExecuteSingleFunctions,
	groupName: string,
): Promise<IDataObject[]> {
	if (!groupName) {
		throw new NodeApiError(this.getNode(), {}, { message: 'Group is required to fetch users.' });
	}

	const responseData = (await makeAwsRequest.call(this, {
		method: 'POST',
		url: `/?Action=GetGroup&Version=${CURRENT_VERSION}&GroupName=${groupName}`,
	})) as GetGroupResponseBody;

	const users = responseData?.GetGroupResponse?.GetGroupResult?.Users ?? [];

	return users;
}

export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const includeUsers = this.getNodeParameter('includeUsers', 0) as boolean;
	const responseBody = response.body as GetGroupResponseBody | GetAllGroupsResponseBody;
	const processedItems: INodeExecutionData[] = [];

	if ('GetGroupResponse' in responseBody) {
		const groupData = responseBody.GetGroupResponse.GetGroupResult;
		const group = groupData.Group;

		return [{ json: includeUsers ? { ...group, Users: groupData.Users ?? [] } : group }];
	}

	if ('ListGroupsResponse' in responseBody) {
		const groups = responseBody.ListGroupsResponse.ListGroupsResult.Groups ?? [];

		if (groups.length === 0) return items;

		if (!includeUsers) {
			return groups.map((group) => ({ json: group }));
		}

		for (const group of groups) {
			const groupName = group.GroupName as string;
			if (!groupName) continue;

			const users = await searchUsersForGroup.call(this, groupName);
			processedItems.push({ json: { ...group, Users: users } });
		}

		return processedItems;
	}

	return items;
}

export async function processUsersResponse(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (!response.body) return [];

	const operation = this.getNodeParameter('operation');

	if (operation === 'get') {
		const user = (response.body as GetUserResponseBody)?.GetUserResponse?.GetUserResult?.User;
		return user ? [{ json: user }] : [];
	}

	if (operation === 'getAll') {
		const users =
			(response.body as GetAllUsersResponseBody)?.ListUsersResponse?.ListUsersResult?.Users ?? [];
		return users.map((user) => ({ json: user }));
	}

	return [];
}

export async function deleteGroupMembers(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const groupName = (this.getNodeParameter('group') as IDataObject)?.value as string;

	if (!groupName)
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Group is required',
				description: 'Please provide a value in Group field to delete a group.',
			},
		);

	const users = await searchUsersForGroup.call(this, groupName);
	if (!users.length) return requestOptions;

	await Promise.all(
		users.map(async (user) => {
			const userName = user.UserName;
			if (!userName) return;
			try {
				await makeAwsRequest.call(this, {
					method: 'POST',
					url: `/?Action=RemoveUserFromGroup&GroupName=${groupName}&UserName=${userName}&Version=${CURRENT_VERSION}`,
					ignoreHttpStatusErrors: true,
				});
			} catch (error) {
				console.error(`⚠️ Failed to remove user "${userName}" from "${groupName}":`, error);
			}
		}),
	);
	return requestOptions;
}

export async function validatePath(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const path = this.getNodeParameter('additionalFields.path', '') as string;
	const newPath = this.getNodeParameter('additionalFields.newPath', '') as string;

	const selectedPath = newPath || path;

	if (selectedPath.length < 1 || selectedPath.length > 512) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Invalid path length',
				description: 'Path must be between 1 and 512 characters long.',
			},
		);
	}

	const validPathRegex = /^\/[\u0021-\u007E]*\/$/;

	if (!validPathRegex.test(selectedPath) && selectedPath !== '/') {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Invalid path format',
				description: 'Ensure the path follows the pattern: /division_abc/subdivision_xyz/',
			},
		);
	}

	return requestOptions;
}

export async function validateLimit(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const returnAll = this.getNodeParameter('returnAll') as boolean;

	if (!returnAll) {
		const limit = this.getNodeParameter('limit') as number;
		if (!limit) {
			throw new NodeApiError(
				this.getNode(),
				{},
				{
					message: 'Limit has no value provided',
					description: 'Provide a "Limit" value or enable "Return All" to fetch all results.',
				},
			);
		}
		requestOptions.url += `&MaxItems=${limit}`;
	}

	return requestOptions;
}

export async function validateUserPath(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const prefix = this.getNodeParameter('additionalFields.pathPrefix') as string;

	if (!prefix.startsWith('/') || !prefix.endsWith('/')) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Invalid path prefix',
				description: 'Ensure the path is structured correctly, e.g. /division_abc/subdivision_xyz/',
			},
		);
	}

	const responseData: IDataObject = await makeAwsRequest.call(this, {
		method: 'POST',
		url: `/?Action=ListUsers&Version=${CURRENT_VERSION}`,
	});

	const responseBody = responseData as GetAllUsersResponseBody;

	const users = responseBody.ListUsersResponse.ListUsersResult.Users;

	if (!users || users.length === 0) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'No users found',
				description: 'No users found in the group. Please try again.',
			},
		);
	}

	const userPaths = users.map((user) => user.Path as string).filter(Boolean);

	const isPathValid = userPaths.some((path) => path.startsWith(prefix));

	if (!isPathValid) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Path does not exist',
				description: `The "${prefix}" path was not found in your users - try entering a different path.`,
			},
		);
	}

	return requestOptions;
}

export async function removeUserFromGroups(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const userName = (this.getNodeParameter('user') as IDataObject).value as string;
	const userGroups = await searchGroupsForUser.call(this);

	for (const group of userGroups.results) {
		const groupName = group.value;

		await makeAwsRequest.call(this, {
			method: 'POST',
			url: `/?Action=RemoveUserFromGroup&Version=${CURRENT_VERSION}&GroupName=${groupName}&UserName=${userName}`,
		});
	}

	return requestOptions;
}
