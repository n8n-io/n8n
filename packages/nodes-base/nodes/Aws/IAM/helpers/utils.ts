import type {
	IHttpRequestOptions,
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { CURRENT_VERSION } from './constants';
import type {
	GetAllGroupsResponseBody,
	GetAllUsersResponseBody,
	GetGroupResponseBody,
	Tags,
} from './types';
import { searchGroupsForUser } from '../methods/listSearch';
import { awsApiRequest } from '../transport';

export async function encodeBodyAsFormUrlEncoded(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	if (requestOptions.body) {
		requestOptions.body = new URLSearchParams(
			requestOptions.body as Record<string, string>,
		).toString();
	}
	return requestOptions;
}

export async function findUsersForGroup(
	this: IExecuteSingleFunctions,
	groupName: string,
): Promise<IDataObject[]> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: '',
		body: new URLSearchParams({
			Action: 'GetGroup',
			Version: CURRENT_VERSION,
			GroupName: groupName,
		}).toString(),
	};
	const responseData = (await awsApiRequest.call(this, options)) as GetGroupResponseBody;
	return responseData?.GetGroupResponse?.GetGroupResult?.Users ?? [];
}

export async function simplifyGetGroupsResponse(
	this: IExecuteSingleFunctions,
	_: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const includeUsers = this.getNodeParameter('includeUsers', false);
	const responseBody = response.body as GetGroupResponseBody;
	const groupData = responseBody.GetGroupResponse.GetGroupResult;
	const group = groupData.Group;
	return [
		{ json: includeUsers ? { ...group, Users: groupData.Users ?? [] } : group },
	] as INodeExecutionData[];
}

export async function simplifyGetAllGroupsResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const includeUsers = this.getNodeParameter('includeUsers', false);
	const responseBody = response.body as GetAllGroupsResponseBody;
	const groups = responseBody.ListGroupsResponse.ListGroupsResult.Groups ?? [];

	if (groups.length === 0) {
		return items;
	}

	if (!includeUsers) {
		return this.helpers.returnJsonArray(groups);
	}

	const processedItems: IDataObject[] = [];
	for (const group of groups) {
		const users = await findUsersForGroup.call(this, group.GroupName);
		processedItems.push({ ...group, Users: users });
	}
	return this.helpers.returnJsonArray(processedItems);
}

export async function simplifyGetAllUsersResponse(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (!response.body) {
		return [];
	}
	const responseBody = response.body as GetAllUsersResponseBody;
	const users = responseBody?.ListUsersResponse?.ListUsersResult?.Users ?? [];
	return this.helpers.returnJsonArray(users);
}

export async function deleteGroupMembers(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const groupName = this.getNodeParameter('group', undefined, { extractValue: true }) as string;

	const users = await findUsersForGroup.call(this, groupName);
	if (!users.length) {
		return requestOptions;
	}

	await Promise.all(
		users.map(async (user) => {
			const userName = user.UserName as string;
			if (!user.UserName) {
				return;
			}

			try {
				await awsApiRequest.call(this, {
					method: 'POST',
					url: '',
					body: {
						Action: 'RemoveUserFromGroup',
						GroupName: groupName,
						UserName: userName,
						Version: CURRENT_VERSION,
					},
					ignoreHttpStatusErrors: true,
				});
			} catch (error) {
				throw new NodeApiError(this.getNode(), error as JsonObject, {
					message: `Failed to remove user "${userName}" from "${groupName}"!`,
				});
			}
		}),
	);

	return requestOptions;
}

export async function validatePath(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const path = this.getNodeParameter('additionalFields.path') as string;
	if (path.length < 1 || path.length > 512) {
		throw new NodeOperationError(
			this.getNode(),
			'The "Path" parameter must be between 1 and 512 characters long.',
		);
	}

	const validPathRegex = /^\/[\u0021-\u007E]*\/$/;
	if (!validPathRegex.test(path) && path !== '/') {
		throw new NodeOperationError(
			this.getNode(),
			'Ensure the path is structured correctly, e.g. /division_abc/subdivision_xyz/',
		);
	}

	return requestOptions;
}

export async function validateUserPath(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const prefix = this.getNodeParameter('additionalFields.pathPrefix') as string;

	let formattedPrefix = prefix;
	if (!formattedPrefix.startsWith('/')) {
		formattedPrefix = '/' + formattedPrefix;
	}
	if (!formattedPrefix.endsWith('/') && formattedPrefix !== '/') {
		formattedPrefix = formattedPrefix + '/';
	}

	if (requestOptions.body && typeof requestOptions.body === 'object') {
		Object.assign(requestOptions.body, { PathPrefix: formattedPrefix });
	}

	const options: IHttpRequestOptions = {
		method: 'POST',
		url: '',
		body: {
			Action: 'ListUsers',
			Version: CURRENT_VERSION,
		},
	};
	const responseData = (await awsApiRequest.call(this, options)) as GetAllUsersResponseBody;

	const users = responseData.ListUsersResponse.ListUsersResult.Users;
	if (!users || users.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'No users found. Please adjust the "Path" parameter and try again.',
		);
	}

	const userPaths = users.map((user) => user.Path).filter(Boolean);
	const isPathValid = userPaths.some((path) => path?.startsWith(formattedPrefix));
	if (!isPathValid) {
		throw new NodeOperationError(
			this.getNode(),
			`The "${formattedPrefix}" path was not found in your users. Try entering a different path.`,
		);
	}
	return requestOptions;
}

export async function validateName(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const resource = this.getNodeParameter('resource') as string;
	const nameParam = resource === 'user' ? 'userName' : 'groupName';
	const name = this.getNodeParameter(nameParam) as string;

	const maxLength = resource === 'user' ? 64 : 128;
	const capitalizedResource = resource.replace(/^./, (c) => c.toUpperCase());
	const validNamePattern = /^[a-zA-Z0-9-_]+$/;

	const isInvalid = !validNamePattern.test(name) || name.length > maxLength;

	if (/\s/.test(name)) {
		throw new NodeOperationError(
			this.getNode(),
			`${capitalizedResource} name should not contain spaces.`,
		);
	}

	if (isInvalid) {
		throw new NodeOperationError(
			this.getNode(),
			`${capitalizedResource} name can have up to ${maxLength} characters. Valid characters: letters, numbers, hyphens (-), and underscores (_).`,
		);
	}

	return requestOptions;
}

export async function validatePermissionsBoundary(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const permissionsBoundary = this.getNodeParameter(
		'additionalFields.permissionsBoundary',
	) as string;

	if (permissionsBoundary) {
		const arnPattern = /^arn:aws:iam::\d{12}:policy\/[\w\-+\/=._]+$/;

		if (!arnPattern.test(permissionsBoundary)) {
			throw new NodeOperationError(
				this.getNode(),
				'Permissions boundaries must be provided in ARN format (e.g. arn:aws:iam::123456789012:policy/ExampleBoundaryPolicy). These can be found at the top of the permissions boundary detail page in the IAM dashboard.',
			);
		}

		if (requestOptions.body) {
			Object.assign(requestOptions.body, { PermissionsBoundary: permissionsBoundary });
		} else {
			requestOptions.body = {
				PermissionsBoundary: permissionsBoundary,
			};
		}
	}
	return requestOptions;
}

export async function preprocessTags(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const tagsData = this.getNodeParameter('additionalFields.tags') as Tags;
	const tags = tagsData?.tags || [];

	let bodyObj: Record<string, string> = {};
	if (typeof requestOptions.body === 'string') {
		const params = new URLSearchParams(requestOptions.body);
		bodyObj = Object.fromEntries(params.entries());
	}

	tags.forEach((tag, index) => {
		if (!tag.key || !tag.value) {
			throw new NodeOperationError(
				this.getNode(),
				`Tag at position ${index + 1} is missing '${!tag.key ? 'Key' : 'Value'}'. Both 'Key' and 'Value' are required.`,
			);
		}
		bodyObj[`Tags.member.${index + 1}.Key`] = tag.key;
		bodyObj[`Tags.member.${index + 1}.Value`] = tag.value;
	});

	requestOptions.body = new URLSearchParams(bodyObj).toString();

	return requestOptions;
}

export async function removeUserFromGroups(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const userName = this.getNodeParameter('user', undefined, { extractValue: true });
	const userGroups = await searchGroupsForUser.call(this);

	for (const group of userGroups.results) {
		await awsApiRequest.call(this, {
			method: 'POST',
			url: '',
			body: {
				Action: 'RemoveUserFromGroup',
				Version: CURRENT_VERSION,
				GroupName: group.value,
				UserName: userName,
			},
		});
	}

	return requestOptions;
}
