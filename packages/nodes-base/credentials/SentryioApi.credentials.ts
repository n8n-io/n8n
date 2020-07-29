import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SentryioApi implements ICredentialType {
	name = 'sentryioApi';
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
