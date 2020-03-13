import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class HubspotDeveloperApi implements ICredentialType {
	name = 'hubspotDeveloperApi';
	displayName = 'Hubspot API';
	properties = [
		{
			displayName: 'Developer API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
