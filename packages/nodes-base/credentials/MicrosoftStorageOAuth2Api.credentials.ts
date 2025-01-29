import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftStorageOAuth2Api implements ICredentialType {
	name = 'microsoftStorageOAuth2Api';

	displayName = 'Microsoft Storage OAuth2 API';

	extends = ['microsoftOAuth2Api'];

	documentationUrl = 'microsoftstorage';

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
