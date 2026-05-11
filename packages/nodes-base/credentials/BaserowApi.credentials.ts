import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

// https://api.baserow.io/api/redoc/#section/Authentication

export class BaserowApi implements ICredentialType {
	name = 'baserowApi';

	displayName = 'Baserow API';

	documentationUrl = 'baserow';

	properties: INodeProperties[] = [
		{
			displayName:
				"This type of connection (Username & Password) is deprecated. Please create a new credential of type 'Baserow Token API' instead.",
			name: 'deprecated',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			default: 'https://api.baserow.io',
		},
		{
			displayName: 'Session Token',
			name: 'jwtToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			description: 'Email address you use to login to Baserow',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const host = (credentials.host as string).replace(/\/$/, '');
		const { token } = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${host}/api/user/token-auth/`,
			body: {
				username: credentials.username,
				password: credentials.password,
			},
		})) as { token: string };
		return { jwtToken: token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=JWT {{$credentials.jwtToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.host}}',
			url: '/api/applications/',
		},
	};
}
