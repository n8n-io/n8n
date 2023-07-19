import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AzureIAMOAuth2Api implements ICredentialType {
	name = 'azureIAMOAuth2Api';

	displayName = 'Azure IAM OAuth2 API';

	extends = ['microsoftOAuth2Api'];

	icon = 'file:icons/Azure.svg';

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
