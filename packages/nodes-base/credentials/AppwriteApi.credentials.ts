import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class AppwriteApi implements ICredentialType {
	name = 'appwriteApi';
	displayName = 'Appwrite API';
	documentationUrl = 'appwrite';
	properties = [
		{
			displayName: 'Appwrite Server URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://api.appwrite.io',
		},
		{
			displayName: 'Project ID',
			name: 'projectId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
