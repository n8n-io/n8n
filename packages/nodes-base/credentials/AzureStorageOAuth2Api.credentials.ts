import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AzureStorageOAuth2Api implements ICredentialType {
	name = 'azureStorageOAuth2Api';

	displayName = 'Azure Storage OAuth2 API';

	extends = ['microsoftOAuth2Api'];

	documentationUrl = 'azurestorage';

	properties: INodeProperties[] = [
		{
			displayName: 'Account',
			name: 'account',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'hidden',
			default: '=https://{{ $self["account"] }}.blob.core.windows.net',
		},
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description: 'Define custom scopes',
		},
		{
			displayName:
				'The default scopes needed for the node to work are already set, If you change these the node may not function correctly.',
			name: 'customScopesNotice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
		},
		{
			displayName: 'Enabled Scopes',
			name: 'enabledScopes',
			type: 'string',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
			default: 'https://storage.azure.com/.default',
			description: 'Scopes that should be enabled',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{$self["customScopes"] ? $self["enabledScopes"] : "https://storage.azure.com/.default"}}',
		},
		{
			displayName: 'Microsoft Graph API Base URL',
			name: 'graphApiBaseUrl',
			type: 'hidden',
			default: 'https://graph.microsoft.com',
		},
	];
}
