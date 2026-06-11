import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HubspotAppToken implements ICredentialType {
	name = 'hubspotAppToken';

	displayName = 'HubSpot Service Key';

	documentationUrl = 'hubspot';

	properties: INodeProperties[] = [
		{
			displayName: 'Service Key',
			name: 'appToken',
			type: 'string',
			typeOptions: { password: true },
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
