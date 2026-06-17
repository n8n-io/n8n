import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

import { beeminderApiRequest, beeminderApiRequestAllItems } from './GenericFunctions';

export interface Datapoint {
	timestamp: number;
	value: number;
	comment?: string;
	requestid?: string;
	daystamp?: string;
}

export async function createDatapoint(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: {
		goalName: string;
		value: number;
		timestamp?: number;
		comment?: string;
		requestid?: string;
	},
) {
	const endpoint = `/users/me/goals/${data.goalName}/datapoints.json`;

	return await beeminderApiRequest.call(this, 'POST', endpoint, data, {});
}

export async function getAllDatapoints(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: { goalName: string; count?: number; sort?: string; page?: number; per?: number },
) {
	const endpoint = `/users/me/goals/${data.goalName}/datapoints.json`;

	if (data.count !== undefined) {
		return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data);
	}

	return await beeminderApiRequestAllItems.call(this, 'GET', endpoint, {}, data);
}

export async function updateDatapoint(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: {
		goalName: string;
		datapointId: string;
		value?: number;
		comment?: string;
		timestamp?: number;
	},
) {
	const endpoint = `/users/me/goals/${data.goalName}/datapoints/${data.datapointId}.json`;

	return await beeminderApiRequest.call(this, 'PUT', endpoint, data, {});
}

export async function deleteDatapoint(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: { goalName: string; datapointId: string },
) {
	const endpoint = `/users/me/goals/${data.goalName}/datapoints/${data.datapointId}.json`;

	return await beeminderApiRequest.call(this, 'DELETE', endpoint);
}

export async function createCharge(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: { amount: number; note?: string; dryrun?: boolean },
) {
	const endpoint = '/charges.json';

	const body = {
		user_id: 'me',
		amount: data.amount,
		...(data.note && { note: data.note }),
		...(data.dryrun && { dryrun: data.dryrun }),
	};

	return await beeminderApiRequest.call(this, 'POST', endpoint, body, {});
}

export async function uncleGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: { goalName: string },
) {
	const endpoint = `/users/me/goals/${data.goalName}/uncleme.json`;

	return await beeminderApiRequest.call(this, 'POST', endpoint);
}

export async function createAllDatapoints(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: { goalName: string; datapoints: Datapoint[] },
) {
	const endpoint = `/users/me/goals/${data.goalName}/datapoints/create_all.json`;

	const body = {
		datapoints: data.datapoints,
	};

	return await beeminderApiRequest.call(this, 'POST', endpoint, body, {});
}

export async function getSingleDatapoint(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: { goalName: string; datapointId: string },
) {
	const endpoint = `/users/me/goals/${data.goalName}/datapoints/${data.datapointId}.json`;

	return await beeminderApiRequest.call(this, 'GET', endpoint);
}

// Goal Operations
export async function getGoal(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: { goalName: string; datapoints?: boolean; emaciated?: boolean },
) {
	const endpoint = `/users/me/goals/${data.goalName}.json`;

	return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data);
}

export async function getAllGoals(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	data?: { emaciated?: boolean },
) {
	const endpoint = '/users/me/goals.json';

	return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data || {});
}

export async function getArchivedGoals(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	data?: { emaciated?: boolean },
) {
	const endpoint = '/users/me/goals/archived.json';

	return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data || {});
}

export async function createGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: {
		slug: string;
		title: string;
		goal_type: string;
		gunits: string;
		goaldate?: number;
		goalval?: number;
		rate?: number;
		initval?: number;
		secret?: boolean;
		datapublic?: boolean;
		datasource?: string;
		dryrun?: boolean;
		tags?: string[];
	},
) {
	const endpoint = '/users/me/goals.json';

	return await beeminderApiRequest.call(this, 'POST', endpoint, data, {});
}

export async function updateGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: {
		goalName: string;
		title?: string;
		yaxis?: string;
		tmin?: string;
		tmax?: string;
		secret?: boolean;
		datapublic?: boolean;
		roadall?: object;
		datasource?: string;
		tags?: string[];
	},
) {
	const endpoint = `/users/me/goals/${data.goalName}.json`;

	return await beeminderApiRequest.call(this, 'PUT', endpoint, data, {});
}

export async function refreshGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: { goalName: string },
) {
	const endpoint = `/users/me/goals/${data.goalName}/refresh_graph.json`;

	return await beeminderApiRequest.call(this, 'GET', endpoint);
}

export async function shortCircuitGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: { goalName: string },
) {
	const endpoint = `/users/me/goals/${data.goalName}/shortcircuit.json`;

	return await beeminderApiRequest.call(this, 'POST', endpoint);
}

export async function stepDownGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: { goalName: string },
) {
	const endpoint = `/users/me/goals/${data.goalName}/stepdown.json`;

	return await beeminderApiRequest.call(this, 'POST', endpoint);
}

export async function cancelStepDownGoal(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: { goalName: string },
) {
	const endpoint = `/users/me/goals/${data.goalName}/cancel_stepdown.json`;

	return await beeminderApiRequest.call(this, 'POST', endpoint);
}

// User Operations
export async function getUser(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	data: {
		associations?: boolean;
		diff_since?: number;
		skinny?: boolean;
		emaciated?: boolean;
		datapoints_count?: number;
	},
) {
	const endpoint = '/users/me.json';

	return await beeminderApiRequest.call(this, 'GET', endpoint, {}, data);
}
