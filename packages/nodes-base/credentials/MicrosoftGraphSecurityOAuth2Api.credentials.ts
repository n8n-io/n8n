import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftGraphSecurityOAuth2Api implements ICredentialType {
	name = 'microsoftGraphSecurityOAuth2Api';
	displayName = 'Microsoft Graph Security OAuth2 API';
	extends = ['microsoftOAuth2Api'];
	documentationUrl = 'microsoft';
	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'options',
			options: [
				{
					name: 'Read & Write',
					value: 'SecurityEvents.ReadWrite.All',
				},
				{
					name: 'Read Only',
					value: 'SecurityEvents.Read.All',
				},
			],
			default: 'Read & Write',
		},
	];
}
