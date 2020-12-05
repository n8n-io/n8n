import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class StoryblokManagementApi implements ICredentialType {
	name = 'storyblokManagementApi';
	displayName = 'Storyblok Management API';
	documentationUrl = 'storyblok';
	properties = [
		{
			displayName: 'Personal Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
