import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftSentinelOAuth2Api implements ICredentialType {
	name = 'microsoftSentinelOAuth2Api';

	displayName = 'Microsof Sentinel API';

	extends = ['microsoftOAuth2Api'];

	icon = 'file:icons/Microsoft.svg';

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
