import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HubspotApi implements ICredentialType {
	name = 'hubspotApi';
	displayName = 'Hubspot API';
	documentationUrl = 'hubspot';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
	];
}
