import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	IProjectDto,
} from './ProjectInterfaces';

import {
	ITagDto,
} from './CommonDtos';

import {
	find,
} from 'lodash';

import {
	ITimeEntryRequest,
} from './TimeEntryInterfaces';

export async function clockifyApiRequest(this: ILoadOptionsFunctions | IPollFunctions | IExecuteFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('clockifyApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');

	}
	const BASE_URL = 'https://api.clockify.me/api/v1';

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'X-Api-Key': credentials.apiKey as string,
		},
		method,
		qs,
		body,
		uri: `${BASE_URL}/${resource}`,
		json: true,
		useQuerystring: true,
	};

	try {

		return await this.helpers.request!(options);

	} catch (error) {

		let errorMessage = error.message;

		if (error.response.body && error.response.body.message) {

			errorMessage = `[${error.statusCode}] ${error.response.body.message}`;

		}

		throw new Error('Clockify Error: ' + errorMessage);
	}
}

export async function clockifyApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query['page-size'] = 50;

	query.page = 1;

	do {
		responseData = await clockifyApiRequest.call(this, method, endpoint, body, query);

		returnData.push.apply(returnData, responseData);

		if (query.limit && (returnData.length >= query.limit)) {

			return returnData;
		}

		query.page++;

	} while (
		responseData.length !== 0
	);

	return returnData;
}

export async function findProjectByName(this: IExecuteFunctions | ILoadOptionsFunctions, workspaceId: number, projectName: string, clientId: string): Promise<IProjectDto | undefined> {
	const resource = `workspaces/${workspaceId}/projects`;
	const qs: IDataObject = {};
	qs.name = projectName.trim().replace(/\s/g, '+');

	let result = await clockifyApiRequest.call(this, 'GET', `${resource}?name=${qs.name}`);
	result = find(result,
		{
			"clientId": clientId
		});
	return result;
}
