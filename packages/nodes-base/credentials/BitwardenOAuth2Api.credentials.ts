import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

// https://bitwarden.com/help/article/public-api/#authentication

export class BitwardenOAuth2Api implements ICredentialType {
	name = 'bitwardenOAuth2Api';
	displayName = 'Bitwarden OAuth2 API';
	documentationUrl = 'bitwarden';
	properties = [
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://identity.bitwarden.com/connect/token',
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options' as NodePropertyTypes,
			default: 'cloudHosted',
			options: [
				{
					name: 'Cloud-hosted',
					value: 'cloudHosted',
				},
				{
					name: 'Self-hosted',
					value: 'selfHosted',
				},
			],
		},
		{
			displayName: 'Self-hosted domain',
			name: 'domain',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://www.mydomain.com',
			displayOptions: {
				show: {
					environment: [
						'selfHosted',
					],
				},
			},
		},
	];
}
