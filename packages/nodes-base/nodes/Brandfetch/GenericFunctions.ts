import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

export async function brandfetchApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	try {
		const credentials = await this.getCredentials('brandfetchApi');
		let options: OptionsWithUri = {
			headers: {
				'x-api-key': credentials.apiKey,
			},
			method,
			qs,
			body,
			uri: uri ?? `https://api.brandfetch.io/v1${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);

		if (this.getNodeParameter('operation', 0) === 'logo' && options.json === false) {
			delete options.headers;
		}

		if (!Object.keys(body).length) {
			delete options.body;
		}
		if (!Object.keys(qs).length) {
			delete options.qs;
		}

		const response = await this.helpers.request(options);

		if (response.statusCode && response.statusCode !== 200) {
			throw new NodeApiError(this.getNode(), response);
		}

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
