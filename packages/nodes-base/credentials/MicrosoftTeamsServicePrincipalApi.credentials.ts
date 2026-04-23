import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftTeamsServicePrincipalApi implements ICredentialType {
	name = 'microsoftTeamsServicePrincipalApi';

	extends = ['microsoftServicePrincipalOAuth2Api'];

	displayName = 'Microsoft Teams Service Principal';

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'https://graph.microsoft.com/.default',
		},
	];
}
