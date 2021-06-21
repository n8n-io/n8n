import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HubspotDeveloperApi implements ICredentialType {
	name = 'hubspotDeveloperApi';
	displayName = 'Hubspot Developer API';
	documentationUrl = 'hubspot';
	properties: INodeProperties[] = [
		{
			displayName: 'Developer API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			default: '',
		},
		{
			displayName: 'App ID',
			name: 'appId',
			type: 'string',
			required: true,
			default: '',
			description: 'The App ID',
		},
	];
}
