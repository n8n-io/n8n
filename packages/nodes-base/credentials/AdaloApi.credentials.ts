import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class AdaloApi implements ICredentialType {
	name = 'adaloApi';
	displayName = 'Adalo API';
	documentationUrl = 'adalo';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Application ID',
			name: 'appId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
