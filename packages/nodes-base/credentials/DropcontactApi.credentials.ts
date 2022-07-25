import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class DropcontactApi implements ICredentialType {
	name = 'dropcontactApi';
	displayName = 'Dropcontact API';
	documentationUrl = 'dropcontact';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
