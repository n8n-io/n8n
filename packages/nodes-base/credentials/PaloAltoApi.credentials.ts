import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class PaloAltoApi implements ICredentialType {
	name = 'paloAltoApi';

	displayName = 'PaloAlto API';

	documentationUrl = 'metabase';

	properties: INodeProperties[] = [
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
		{
			displayName: 'Firewall url',
			name: 'url',
			type: 'string',
			default: '',
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

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const url = credentials.url as string;
		const { id } = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${url.endsWith('/') ? url.slice(0, -1) : url}/api/`,
			body: {
				username: credentials.username,
				password: credentials.password,
			},
		})) as { id: string };
		return { sessionToken: id };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Metabase-Session': '={{$credentials.sessionToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}',
			url: '/api/user/current',
		},
	};
}
