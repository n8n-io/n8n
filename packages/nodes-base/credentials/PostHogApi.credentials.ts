import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class PostHogApi implements ICredentialType {
	name = 'postHogApi';
	displayName = 'PostHog API';
	properties = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: 'https://app.posthog.com',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
