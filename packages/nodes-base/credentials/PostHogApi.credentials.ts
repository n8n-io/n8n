import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class PostHogApi implements ICredentialType {
	name = 'postHogApi';

	displayName = 'PostHog API';

	documentationUrl = 'postHog';

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: 'https://app.posthog.com',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
