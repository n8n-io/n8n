import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SentryIoServerApi implements ICredentialType {
	name = 'sentryIoServerApi';
	displayName = 'Sentry.io API';
	properties = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string' as NodePropertyTypes,
			default: '',
		},		{
			displayName: 'URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://example.com',
		},
	];
}
