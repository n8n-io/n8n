import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class DiscourseApi implements ICredentialType {
	name = 'discourseApi';
	displayName = 'Discourse API';
	documentationUrl = 'discourse';
	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			required: true,
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			required: true,
			type: 'string',
			default: '',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			'Api-Key': credentials.apiKey,
			'Api-Username': credentials.username,
		};

		if (requestOptions.method === 'GET') {
			delete requestOptions.body;
		}

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/admin/groups.json',
			method: 'GET',
		},
	};
}
