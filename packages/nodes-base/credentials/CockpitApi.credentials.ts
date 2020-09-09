import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class CockpitApi implements ICredentialType {
	name = 'cockpitApi';
	displayName = 'Cockpit API';
	documentationUrl = 'cockpit';
	properties = [
		{
			displayName: 'Cockpit URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://example.com',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
