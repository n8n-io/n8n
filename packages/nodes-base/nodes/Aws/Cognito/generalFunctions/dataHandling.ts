import {
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';

import { listUsersInGroup, searchUsersForGroup } from './helpers';

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
		const users = await listUsersInGroup.call(this, group.GroupName, userPoolId);

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
