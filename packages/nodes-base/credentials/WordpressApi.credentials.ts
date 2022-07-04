import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WordpressApi implements ICredentialType {
	name = 'wordpressApi';
	displayName = 'Wordpress API';
	documentationUrl = 'wordpress';
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
			displayName: 'Wordpress URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://example.com',
		},
	];
 authenticate: IAuthenticateGeneric = {
	type: 'generic',
	properties: {
		auth: {
			username: '={{$credentials.username}}',
			password: '={{$credentials.password}}',
		},
	},
};
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.url}}/wp-json/wp/v2',
			url: '/users',
			method: 'GET',
		},
	};
}
