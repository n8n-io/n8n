import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';

export async function acuitySchedulingApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('acuitySchedulingApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const base64Key =  Buffer.from(`${credentials.userId}:${credentials.apiKey}`).toString('base64');
	let options: OptionsWithUri = {
		headers: {
			Authorization: `Basic ${base64Key}`,
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: uri ||`https://acuityscheduling.com/api/v1${resource}`,
		json: true
	};
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new Error('Acuity Scheduling Error: ' + error.message);
	}
}
