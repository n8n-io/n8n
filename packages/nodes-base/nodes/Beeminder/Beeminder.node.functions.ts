import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

import { beeminderApiRequest, beeminderApiRequestAllItems } from './GenericFunctions';

export async function createDatapoint(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/datapoints.json`;

	return await beeminderApiRequest.call(this, 'POST', endpoint, data);
}

export async function getAllDatapoints(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/datapoints.json`;

	if (data.count !== undefined) {
		return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data);
	}

	return await beeminderApiRequestAllItems.call(this, 'GET', endpoint, {}, data);
}

export async function updateDatapoint(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/datapoints/${data.datapointId}.json`;

	return await beeminderApiRequest.call(this, 'PUT', endpoint, data);
}

export async function deleteDatapoint(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/datapoints/${data.datapointId}.json`;

	return await beeminderApiRequest.call(this, 'DELETE', endpoint);
}

export async function createCharge(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/charges.json`;

	const body = {
		user_id: credentials.user,
		amount: data.amount,
		...(data.note && { note: data.note }),
		...(data.dryrun && { dryrun: data.dryrun }),
	};

	return await beeminderApiRequest.call(this, 'POST', endpoint, body);
}

export async function uncleGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/uncleme.json`;

	return await beeminderApiRequest.call(this, 'POST', endpoint);
}

export async function createAllDatapoints(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/datapoints/create_all.json`;

	const body = {
		datapoints: data.datapoints,
	};

	return await beeminderApiRequest.call(this, 'POST', endpoint, body);
}

export async function getSingleDatapoint(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/datapoints/${data.datapointId}.json`;

	return await beeminderApiRequest.call(this, 'GET', endpoint);
}

// Goal Operations
export async function getGoal(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}.json`;

	return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data);
}

export async function getAllGoals(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	data?: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals.json`;

	return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data || {});
}

export async function getArchivedGoals(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/archived.json`;

	return await beeminderApiRequest.call(this, 'GET', endpoint);
}

export async function createGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals.json`;

	return await beeminderApiRequest.call(this, 'POST', endpoint, data);
}

export async function updateGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}.json`;

	return await beeminderApiRequest.call(this, 'PUT', endpoint, data);
}

export async function refreshGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/refresh_graph.json`;

	return await beeminderApiRequest.call(this, 'GET', endpoint);
}

export async function shortCircuitGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/shortcircuit.json`;

	return await beeminderApiRequest.call(this, 'POST', endpoint);
}

export async function stepDownGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/stepdown.json`;

	return await beeminderApiRequest.call(this, 'POST', endpoint);
}

export async function cancelStepDownGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}/goals/${data.goalName}/cancel_stepdown.json`;

	return await beeminderApiRequest.call(this, 'POST', endpoint);
}

// User Operations
export async function getUser(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: IDataObject,
) {
	const credentials = await this.getCredentials('beeminderApi');

	const endpoint = `/users/${credentials.user}.json`;

	return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data);
}
