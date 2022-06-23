import {
	IAuthenticateHeaderAuth,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CalendlyAccessTokenApi implements ICredentialType {
	name = 'calendlyAccessTokenApi';
	displayName = 'Calendly Api';
	documentationUrl = 'calendly';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];
	authenticate: IAuthenticateHeaderAuth = {
		type: 'headerAuth',
		properties: {
			name: 'Authorization',
			value: '=Bearer {{$credentials?.accessToken}}',
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.calendly.com',
			url: '/users/me',
		},
	};
}
