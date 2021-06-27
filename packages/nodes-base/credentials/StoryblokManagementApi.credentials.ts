import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class StoryblokManagementApi implements ICredentialType {
	name = 'storyblokManagementApi';
	displayName = 'Storyblok Management API';
	documentationUrl = 'storyblok';
	properties: INodeProperties[] = [
		{
			displayName: 'Personal Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];
}
