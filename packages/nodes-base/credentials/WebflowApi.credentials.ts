import {
	IAuthenticateHeaderAuth,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WebflowApi implements ICredentialType {
	name = 'webflowApi';
	displayName = 'Webflow API';
	documentationUrl = 'webflow';
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
			value: '=Bearer {{$credentials.accessToken}}',
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.webflow.com',
			url: '/sites',
		},
	};
}
