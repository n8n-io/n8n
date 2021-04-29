import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject,
	INodePropertyOptions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	get,
} from 'lodash';

/**
 * Make an API request to Asana
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function asanaApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: object, uri?: string | undefined): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	const options: OptionsWithUri = {
		headers: {},
		method,
		body: { data: body },
		qs: query,
		uri: uri || `https://app.asana.com/api/1.0${endpoint}`,
		json: true,
	};

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('asanaApi');

			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}

			options.headers!['Authorization'] = `Bearer ${credentials.accessToken}`;

			return await this.helpers.request!(options);
		} else {
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, 'asanaOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function asanaApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.limit = 100;

	do {
		responseData = await asanaApiRequest.call(this, method, endpoint, body, query, uri);
		uri = get(responseData, 'next_page.uri');
		returnData.push.apply(returnData, responseData['data']);
	} while (
		responseData['next_page'] !== null
	);

	return returnData;
}

export async function getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const endpoint = '/workspaces';
	const responseData = await asanaApiRequestAllItems.call(this, 'GET', endpoint, {});

	const returnData: INodePropertyOptions[] = [];
	for (const workspaceData of responseData) {
		if (workspaceData.resource_type !== 'workspace') {
			// Not sure if for some reason also ever other resources
			// get returned but just in case filter them out
			continue;
		}

		returnData.push({
			name: workspaceData.name,
			value: workspaceData.gid,
		});
	}

	returnData.sort((a, b) => {
		if (a.name < b.name) { return -1; }
		if (a.name > b.name) { return 1; }
		return 0;
	});

	return returnData;
}

export function getTaskFields() {
	return [
		'*',
		'GID',
		'Resource Type',
		'name',
		'Approval Status',
		'Assignee Status',
		'Completed',
		'Completed At',
		'Completed By',
		'Created At',
		'Dependencies',
		'Dependents',
		'Due At',
		'Due On',
		'External',
		'HTML Notes',
		'Liked',
		'Likes',
		'Memberships',
		'Modified At',
		'Notes',
		'Num Likes',
		'Resource Subtype',
		'Start On',
		'Assignee',
		'Custom Fields',
		'Followers',
		'Parent',
		'Permalink URL',
		'Projects',
		'Tags',
		'Workspace',
	];
}
