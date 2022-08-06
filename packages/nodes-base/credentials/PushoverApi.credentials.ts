import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class PushoverApi implements ICredentialType {
	name = 'pushoverApi';
	displayName = 'Pushover API';
	documentationUrl = 'pushover';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		if (requestOptions.method === 'GET') {
			Object.assign(requestOptions.qs, { token: credentials.apiKey });
		} else {
			Object.assign(requestOptions.body, { token: credentials.apiKey });
		}
		return requestOptions;
	}
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.pushover.net/1',
			url: '=/licenses.json?token={{$credentials?.apiKey}}',
			method: 'GET',
		},
	};
}
