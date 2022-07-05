import {
	ICredentialDataDecryptedObject,
	 ICredentialTestRequest,
	 ICredentialType,
	 IHttpRequestOptions,
	 INodeProperties,
} from 'n8n-workflow';

export class MauticApi implements ICredentialType {
	name = 'mauticApi';
	displayName = 'Mautic API';
	documentationUrl = 'mautic';
	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://name.mautic.net',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
	async authenticate (credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		const {
			url,
			username,
			password,
		} = credentials as {
			url: string,
			username: string,
			password: string,
		};
		const credentialUrl = url.endsWith('/') ? `${url}api/users/self` : `${url}/api/users/self`;
		const base64Key = Buffer.from(`${username}:${password}`).toString('base64');
		requestOptions.headers!['Authorization'] = `Basic ${base64Key}`;
		requestOptions.url = credentialUrl ? credentialUrl : requestOptions.url;

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url.replace(new RegExp("/$"), "")}}',
			url: '/api/users/self',
		},
	};
}
