import { OptionsWithUri } from 'request';

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, IHookFunctions, IWebhookFunctions, JsonObject, NodeApiError } from 'n8n-workflow';

export async function citrixApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> { // tslint:disable-line:no-any

	const {region, customerId, clientId, clientSecret} = await this.getCredentials('citrixApi') as IDataObject;

	let accessToken = '';
	try {
		const data: OptionsWithUri = {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			method: 'POST',
			body: {
				grant_type: 'client_credentials',
				client_id: clientId,
				client_secret: clientSecret,
			},
			uri: `https://${region}/cctrustoauth2/root/tokens/clients`,
			json: true,
		};

		const response = await this.helpers.request!(data);
		accessToken = response.access_token;

	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}

	let options: OptionsWithUri = {
		headers: {
			'Authorization': `CwsAuth Bearer=${accessToken}`,
		},
		method,
		body,
		qs: query,
		uri: uri || `https://registry.citrixworkspacesapi.net/${customerId}${resource}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
