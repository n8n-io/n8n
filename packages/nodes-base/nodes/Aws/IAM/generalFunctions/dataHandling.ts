import {
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
} from 'n8n-workflow';

import { searchUsersForGroup } from './dataFetching';
import type {
	GetAllGroupsResponseBody,
	GetAllUsersResponseBody,
	GetGroupResponseBody,
	GetUserResponseBody,
	User,
} from './types';
import { makeAwsRequest } from './awsRequest';

export async function processGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const includeUsers = this.getNodeParameter('includeUsers', 0) as boolean;

	const responseBody = response.body as GetGroupResponseBody | GetAllGroupsResponseBody;

	const processedItems: INodeExecutionData[] = [];

	if ('GetGroupResponse' in responseBody) {
		const group = responseBody.GetGroupResponse.GetGroupResult.Group;

		if (!includeUsers) {
			return [{ json: group }];
		}

		const users: IDataObject[] = responseBody.GetGroupResponse.GetGroupResult.Users ?? [];
		const groupWithUsers = { ...group, Users: users };
		return [{ json: groupWithUsers }];
	}

	if ('ListGroupsResponse' in responseBody) {
		const groups = responseBody.ListGroupsResponse.ListGroupsResult.Groups ?? [];

		if (!groups.length) {
			return items;
		}

		if (!includeUsers) {
			for (const group of groups) {
				processedItems.push({ json: group });
			}
			return processedItems;
		}

		for (const group of groups) {
			const groupName = group.GroupName as string;
			if (!groupName) continue;

			let users: IDataObject[] = [];
			try {
				users = await searchUsersForGroup.call(this, groupName);
			} catch (error) {
				console.error(`⚠️ Failed to fetch users for group "${groupName}":`, error);
			}

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
	const actionType = this.getNodeParameter('operation');
	let responseBody;
	let data;

	if (!response.body) {
		return [];
	}

	if (actionType === 'get') {
		responseBody = response.body as GetUserResponseBody;
		data = responseBody.GetUserResponse?.GetUserResult?.User as User;
	} else if (actionType === 'getAll') {
		responseBody = response.body as GetAllUsersResponseBody;
		data = responseBody.ListUsersResponse?.ListUsersResult?.Users as User[];
	}

	if (!data) {
		return [];
	}

	if (!Array.isArray(data)) {
		return [{ json: data }];
	}

	return data.map((user) => ({ json: user }));
}

export async function fetchAndValidateUserPaths(
	this: ILoadOptionsFunctions | IExecuteSingleFunctions,
	prefix: string,
): Promise<void> {
	const opts: IHttpRequestOptions = {
		method: 'POST',
		url: '/?Action=ListUsers&Version=2010-05-08',
	};

	const responseData: IDataObject = await makeAwsRequest.call(this, opts);
	const responseBody = responseData as GetAllUsersResponseBody;

	const users = responseBody.ListUsersResponse.ListUsersResult.Users;

	if (!users || users.length === 0) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'No users found',
				description: 'The user list is empty',
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
}

export async function presendStringifyBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	if (requestOptions.body) {
		requestOptions.body = JSON.stringify(requestOptions.body);
	}
	return requestOptions;
}
