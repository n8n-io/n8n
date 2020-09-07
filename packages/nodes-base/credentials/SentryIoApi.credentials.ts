import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SentryIoApi implements ICredentialType {
	name = 'sentryIoApi';
	displayName = 'Sentry.io API';
	properties = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
