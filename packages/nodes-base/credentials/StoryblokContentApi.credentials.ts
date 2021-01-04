import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class StoryblokContentApi implements ICredentialType {
	name = 'storyblokContentApi';
	displayName = 'Storyblok Content API';
	documentationUrl = 'storyblok';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
