import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftStorageOAuth2Api implements ICredentialType {
	name = 'microsoftStorageOAuth2Api';

	displayName = 'Microsoft Storage API';

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
			// default: '=https://{{ $self["account"] }}.blob.core.windows.net',
			default: '=http://127.0.0.1:10000/{{ $self["account"] }}',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'openid offline_access',
		},
	];
}
