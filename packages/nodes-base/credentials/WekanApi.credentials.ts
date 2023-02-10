import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
} from 'n8n-workflow';

export class WekanApi implements ICredentialType {
	name = 'wekanApi';

	displayName = 'Wekan API';

	documentationUrl = 'wekan';

	properties: INodeProperties[] = [
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
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://wekan.yourdomain.com',
		},
		{
			displayName: 'Session Token',
			name: 'token',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const url = credentials.url as string;
		const { token } = (await this.helpers.httpRequest({
			method: 'POST',
			url: `${url.endsWith('/') ? url.slice(0, -1) : url}/users/login`,
			body: {
				username: credentials.username,
				password: credentials.password,
			},
		})) as { token: string };
		return { token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.token}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url.replace(new RegExp("/$"), "")}}',
			url: '/api/user',
		},
	};
}
