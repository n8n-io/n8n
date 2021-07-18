import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MarketstackApi implements ICredentialType {
	name = 'marketstackApi';
	displayName = 'Marketstack API';
	documentationUrl = 'marketstack';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Use HTTPS',
			name: 'useHttps',
			type: 'boolean' as NodePropertyTypes,
			default: false,
			description: 'Use HTTPS (paid plans only).',
		},
	];
}
