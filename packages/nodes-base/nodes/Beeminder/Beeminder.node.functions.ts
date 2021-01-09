import {
	IExecuteFunctions,
  ILoadOptionsFunctions
} from 'n8n-core';

import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

import {
  beeminderApiRequest
} from './GenericFunctions';

function toUnix(timestamp: string) {
  return Math.round(new Date(timestamp).getTime() / 1000);
};

export async function createDatapoint(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, goalName: string, value: number, comment: string, timestamp: string, requestId: string) {
	const credentials = this.getCredentials('beeminderApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
  }
  
  const endpoint = `/users/${credentials.user}/goals/${goalName}/datapoints.json`;

  return await beeminderApiRequest.call(this, credentials, 'POST', endpoint, {
    value,
    comment,
    timestamp: timestamp && toUnix(timestamp),
    requestid: requestId
  });
};

export async function getAllDatapoints(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, goalName: string, sort: string, count: number, page: number, per: number) {
	const credentials = this.getCredentials('beeminderApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
  }
  
  const endpoint = `/users/${credentials.user}/goals/${goalName}/datapoints.json`;

  return await beeminderApiRequest.call(this, credentials, 'GET', endpoint, {}, {
    sort,
    count,
    page,
    per
  });
}

export async function updateDatapoint(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, goalName: string, datapointId: string, value: number, comment: string, timestamp: string) {
	const credentials = this.getCredentials('beeminderApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
  }
  
  const endpoint = `/users/${credentials.user}/goals/${goalName}/datapoints/${datapointId}.json`;

  return await beeminderApiRequest.call(this, credentials, 'PUT', endpoint, {
    value,
    comment,
    timestamp: timestamp && toUnix(timestamp)
  });
}

export async function deleteDatapoint(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, goalName: string, datapointId: string) {
	const credentials = this.getCredentials('beeminderApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
  }
  
  const endpoint = `/users/${credentials.user}/goals/${goalName}/datapoints/${datapointId}.json`;

  return await beeminderApiRequest.call(this, credentials, 'DELETE', endpoint);
};

