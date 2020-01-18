import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';

export async function clickupApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('clickUpApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	let options: OptionsWithUri = {
		headers: {
			Authorization: credentials.accessToken,
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: uri ||`https://api.clickup.com/api/v2${resource}`,
		json: true
	};
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		let errorMessage = error;
		if (error.err) {
			errorMessage = error.err
		}
		throw new Error('Click Up Error: ' + errorMessage);
	}
}
