import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class KitemakerApi implements ICredentialType {
	name = 'kitemakerApi';
	displayName = 'Kitemaker API';
	documentationUrl = 'kitemaker';
	properties = [
		{
			displayName: 'Personal Access Token',
			name: 'personalAccessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
