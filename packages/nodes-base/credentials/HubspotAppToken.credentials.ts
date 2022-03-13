import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HubspotAppToken implements ICredentialType {
	name = 'hubspotAppToken';
	displayName = 'Hubspot App Token';
	documentationUrl = 'hubspot';
	properties: INodeProperties[] = [
		{
			displayName: 'App Token',
			name: 'appToken',
			type: 'string',
			default: '',
		},
	];
}
