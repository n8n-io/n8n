import {
	IAuthenticate,
	IAuthenticateBearer,
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
	authenticate = {
		type: 'bearer',
		properties: {
			tokenPropertyName: 'appToken',
		},
	} as IAuthenticateBearer;
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.hubapi.com',
			url: '/properties/v2/tickets/properties',
		},
	};
}
