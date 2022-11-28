import {
	IAuthenticateGeneric,
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

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.appToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.hubapi.com',
			url: '/account-info/v3/details',
		},
	};
}
