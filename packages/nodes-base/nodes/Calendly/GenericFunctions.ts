import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IWebhookFunctions,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';

export function getCredentialsType(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
): 'calendlyApi' | 'calendlyOAuth2Api' {
	const authentication = this.getNodeParameter('authentication', 0) as string;
	return authentication === 'apiKey' ? 'calendlyApi' : 'calendlyOAuth2Api';
}

export async function calendlyApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: IDataObject = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<IDataObject> {
	const headers: IDataObject = {
		'Content-Type': 'application/json',
	};

	const endpoint = 'https://api.calendly.com';

	let options: IRequestOptions = {
		headers,
		method,
		body,
		qs: query,
		uri: uri || `${endpoint}${resource}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);

	const credentialsType = getCredentialsType.call(this);
	return await this.helpers.requestWithAuthentication.call(this, credentialsType, options);
}
