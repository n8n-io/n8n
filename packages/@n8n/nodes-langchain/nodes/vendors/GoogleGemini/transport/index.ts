import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

type RequestParameters = {
	headers?: IDataObject;
	body?: IDataObject | string;
	qs?: IDataObject;
	option?: IDataObject;
};

type GooglePalmApiCredentials = {
	host: string;
	apiKey: string;
};

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	parameters?: RequestParameters,
) {
	const { body, qs, option, headers } = parameters ?? {};

	const credentials = await this.getCredentials<GooglePalmApiCredentials>('googlePalmApi');

	let url = `https://generativelanguage.googleapis.com${endpoint}`;

	if (credentials.host) {
		url = `${credentials.host}${endpoint}`;
	}

	const options = {
		headers,
		method,
		body,
		qs,
		url,
		json: true,
	};

	if (option && Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, 'googlePalmApi', options);
}
