import { OptionsWithUri } from 'request';

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';
import { NodeApiError } from 'n8n-workflow';

export async function rocketchatApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	resource: string,
	method: string,
	operation: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	headers?: object,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('rocketchatApi');

	const options: OptionsWithUri = {
		headers,
		method,
		body,
		uri: `${credentials.domain}/api/v1${resource}.${operation}`,
		json: true,
	};
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.requestWithAuthentication.call(this, 'rocketchatApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

// tslint:disable-next-line:no-any
export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = [];
	}
	return result;
}
