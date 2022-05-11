import {
	IAuthenticateHeaderAuth,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class UrlScanIoApi implements ICredentialType {
	name = 'urlScanIoApi';
	displayName = 'urlscan.io API';
	documentationUrl = 'urlScanIo';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: true,
		},
	];
	authenticate = {
		type: 'headerAuth',
		properties: {
			name: 'API-KEY',
			value: '={{$credentials.apiKey}}',
		},
	} as IAuthenticateHeaderAuth;
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://urlscan.io',
			url: '/user/quotas',
		},
	};
}
