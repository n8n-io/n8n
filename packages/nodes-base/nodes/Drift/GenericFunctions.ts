import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function driftApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	let options: IRequestOptions = {
		headers: {},
		method,
		body,
		qs: query,
		uri: uri || `https://driftapi.com${resource}`,
		json: true,
	};

	if (!Object.keys(body as IDataObject).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('driftApi');

			options.headers!.Authorization = `Bearer ${credentials.accessToken}`;

			return await this.helpers.request(options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'driftOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
