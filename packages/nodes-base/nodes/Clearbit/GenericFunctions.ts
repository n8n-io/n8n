import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError, NodeOperationError, } from 'n8n-workflow';

export async function clearbitApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, api: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('clearbitApi');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}
	let options: OptionsWithUri = {
		headers: { Authorization: `Bearer ${credentials.apiKey}` },
		method,
		qs,
		body,
		uri: uri || `https://${api}.clearbit.com${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
