import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftDefenderApi implements ICredentialType {
	name = 'microsoftDefenderApi';

	displayName = 'Microsoft Defender API';

	extends = ['microsoftOAuth2Api'];

	documentationUrl = 'microsoft';

	icon = 'file:icons/Microsoft.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'user_impersonation',
		},
	];
}
