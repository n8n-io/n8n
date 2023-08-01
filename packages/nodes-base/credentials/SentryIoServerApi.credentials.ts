import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SentryIoServerApi implements ICredentialType {
	name = 'sentryIoServerApi';

	displayName = 'Sentry.io Server API';

	documentationUrl = 'sentryIo';

	properties: INodeProperties[] = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://example.com',
		},
	];
}
