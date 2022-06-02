import {
	IAuthenticateQueryAuth,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HubspotApi implements ICredentialType {
	name = 'hubspotApi';
	displayName = 'HubSpot API';
	documentationUrl = 'hubspot';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
	authenticate: IAuthenticateQueryAuth = {
		type: 'queryAuth',
		properties: {
			key: 'hapikey',
			value: '={{$credentials?.apiKey}}',
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.hubapi.com/deals/v1',
			url: '/deal/paged',
		},
	};
}
