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
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'https://storage.azure.com/.default',
		},
	];
}
