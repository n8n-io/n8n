import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IPollFunctions
} from 'n8n-core';

import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import {IProjectDto} from "./ProjectInterfaces";
import {ITagDto} from "./CommonDtos";
import {find} from "lodash";
import { ITimeEntryRequest } from './TimeEntryInterfaces';

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
			errorMessage = `[${error.response.body.status_code}] ${error.response.body.message}`;
		}

		throw new Error('Clockify Error: ' + errorMessage);
	}
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

export async function findTagByName(this: IExecuteFunctions | ILoadOptionsFunctions, workspaceId: number, tagName: string): Promise<ITagDto | undefined> {
	const resource = `workspaces/${workspaceId}/tags`;
	const tags: ITagDto[] = await clockifyApiRequest.call(this, 'GET', resource);
	let tag = undefined;

	for(let index = 0; index < tags.length; index++){
		if (tags[index].name === tagName){
			tag = tags[index];
			return tag;
		}
	}
	return tag;
}


export async function createProject(this:IExecuteFunctions, project: IProjectDto ): Promise<INodeExecutionData> {
	const resource = `workspaces/${project.workspaceId}/projects`;
	return await clockifyApiRequest.call(this, 'POST', resource, project);
}

export async function createTag(this:IExecuteFunctions, tag: ITagDto ): Promise<INodeExecutionData> {
	const resource = `workspaces/${tag.workspaceId}/tags`;
	return await clockifyApiRequest.call(this, 'POST', resource, tag);
}


export async function createTimeEntry(this:IExecuteFunctions, timeEntry: ITimeEntryRequest ): Promise<INodeExecutionData> {
	const resource = `workspaces/${timeEntry.workspaceId}/time-entries`;
	return await clockifyApiRequest.call(this, 'POST', resource, timeEntry);
}
