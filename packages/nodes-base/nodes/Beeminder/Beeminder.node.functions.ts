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

export async function sendDatpoint(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, goalName: string, value: number, comment: string) {
	const credentials = this.getCredentials('beeminderApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
  }
  
  const endpoint = `/users/${credentials.user}/goals/${goalName}/datapoints.json`;

  return await beeminderApiRequest.call(this, credentials, 'POST', endpoint, {
    value,
    comment
  });
};