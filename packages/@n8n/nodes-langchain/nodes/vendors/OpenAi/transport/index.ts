import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import { normalizePem } from '@utils/helpers';

type RequestParameters = {
	headers?: IDataObject;
	body?: IDataObject | string;
	qs?: IDataObject;
	uri?: string;
	option?: IDataObject;
};

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	parameters?: RequestParameters,
) {
	const { body, qs, option } = parameters ?? {};

	const credentials = await this.getCredentials('openAiApi');

	let uri = `https://api.openai.com/v1${endpoint}`;
	let headers = parameters?.headers ?? {};
	if (credentials.url) {
		uri = `${credentials?.url}${endpoint}`;
	}

	if (
		credentials.header &&
		typeof credentials.headerName === 'string' &&
		credentials.headerName &&
		typeof credentials.headerValue === 'string'
	) {
		headers = {
			...headers,
			[credentials.headerName]: credentials.headerValue,
		};
	}

	const options: IDataObject & {
		headers: IDataObject;
		method: IHttpRequestMethods;
		body?: IDataObject | string;
		qs?: IDataObject;
		uri: string;
		json: boolean;
		agentOptions?: {
			ca?: string;
			cert?: string;
			key?: string;
			passphrase?: string;
		};
	} = {
		headers,
		method,
		body,
		qs,
		uri,
		json: true,
	};

	// Apply TLS client certificates when configured in the OpenAi credential
	if (credentials.sslCertificatesEnabled) {
		if (credentials.cert || credentials.key || credentials.ca) {
			options.agentOptions = {
				ca:
					typeof credentials.ca === 'string' && credentials.ca
						? normalizePem(credentials.ca)
						: undefined,
				cert:
					typeof credentials.cert === 'string' && credentials.cert
						? normalizePem(credentials.cert)
						: undefined,
				key:
					typeof credentials.key === 'string' && credentials.key
						? normalizePem(credentials.key)
						: undefined,
				passphrase:
					typeof credentials.passphrase === 'string' && credentials.passphrase
						? credentials.passphrase
						: undefined,
			};
		}
	}

	if (option && Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	const response = await this.helpers.requestWithAuthentication.call(this, 'openAiApi', options);

	if (response && response.error === null) {
		response.error = undefined;
	}

	return response;
}
