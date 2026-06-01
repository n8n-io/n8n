import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftGraphSecurityOAuth2Api implements ICredentialType {
	name = 'microsoftGraphSecurityOAuth2Api';

	displayName = 'Microsoft Graph Security OAuth2 API';

	extends = ['microsoftOAuth2Api'];

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'SecurityEvents.ReadWrite.All offline_access',
		},
	];
}
