import {
	requestUrl,
	type IAuthenticateGeneric,
	type ICredentialDataDecryptedObject,
	type ICredentialTestRequest,
	type ICredentialType,
	type IHttpRequestHelper,
	type INodeProperties,
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
		const { token } = (await this.helpers.httpRequest({
			method: 'POST',
			url: requestUrl`${credentials.url}/users/login`,
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
