import {
	OptionsWithUri,
} from 'request';

import {
	IAnalyzer,
	IJob,
	IResponder,
} from './AnalyzerInterface';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

import * as moment from 'moment';

export async function cortexApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('cortexApi');

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const headerWithAuthentication = Object.assign({}, { Authorization: ` Bearer ${credentials.cortexApiKey}` });

	let options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `${credentials.host}/api${resource}`,
		body,
		json: true,

	};
	if (Object.keys(option).length !== 0) {
		options = Object.assign({}, options, option);
	}
	if (Object.keys(body).length === 0) {
		delete options.body;
	}
	if (Object.keys(query).length === 0) {
		delete options.qs;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function getEntityLabel(entity: IDataObject): string {
	let label = '';
	switch (entity._type) {
		case 'case':
			label = `#${entity.caseId} ${entity.title}`;
			break;
		case 'case_artifact':
			//@ts-ignore
			label = `[${entity.dataType}] ${entity.data ? entity.data : (entity.attachment.name)}`;
			break;
		case 'alert':
			label = `[${entity.source}:${entity.sourceRef}] ${entity.title}`;
			break;
		case 'case_task_log':
			label = `${entity.message} from ${entity.createdBy}`;
			break;
		case 'case_task':
			label = `${entity.title} (${entity.status})`;
			break;
		case 'job':
			label = `${entity.analyzerName} (${entity.status})`;
			break;
		default:
			break;
	}
	return label;
}

export function splitTags(tags: string): string[] {
	return tags.split(',').filter(tag => tag !== ' ' && tag);
}

export function prepareParameters(values: IDataObject): IDataObject {
	const response: IDataObject = {};
	for (const key in values) {
		if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
			if (moment(values[key] as string, moment.ISO_8601).isValid()) {
				response[key] = Date.parse(values[key] as string);
			} else if (key === 'tags') {
				response[key] = splitTags(values[key] as string);
			} else {
				response[key] = values[key];
			}
		}
	}
	return response;
}
