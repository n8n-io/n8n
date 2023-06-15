import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftDefenderApi implements ICredentialType {
	name = 'microsofDefenderApi';

	displayName = 'Microsof Defender API';

	extends = ['microsoftOAuth2Api'];

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'user_impersonation',
		},
	];
}
