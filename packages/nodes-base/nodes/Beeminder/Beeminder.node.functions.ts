import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { beeminderApiRequest, beeminderApiRequestAllItems } from './GenericFunctions';

export async function createDatapoint(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/datapoints.json`;

	return beeminderApiRequest.call(this, 'POST', endpoint, data);
}

export async function getAllDatapoints(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/datapoints.json`;

	if (data.count !== undefined) {
		return beeminderApiRequest.call(this, 'GET', endpoint, {}, data);
	}

	return beeminderApiRequestAllItems.call(this, 'GET', endpoint, {}, data);
}

export async function updateDatapoint(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/datapoints/${data.datapointId}.json`;

	return beeminderApiRequest.call(this, 'PUT', endpoint, data);
}

export async function deleteDatapoint(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/datapoints/${data.datapointId}.json`;

	return beeminderApiRequest.call(this, 'DELETE', endpoint);
}
