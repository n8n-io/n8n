import {
	IAuthenticateHeaderAuth,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HubspotAppToken implements ICredentialType {
	name = 'hubspotAppToken';
	displayName = 'HubSpot App Token';
	documentationUrl = 'hubspot';
	properties: INodeProperties[] = [
		{
			displayName: 'APP Token',
			name: 'appToken',
			type: 'string',
			default: '',
		},
	];
	authenticate: IAuthenticateHeaderAuth = {
		type: 'headerAuth',
		properties: {
			name: 'Authorization',
			value: '=Bearer {{$credentials?.appToken}}',
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.hubapi.com/deals/v1',
			url: '/deal/paged',
		},
	};
}
