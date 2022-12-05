import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftOneDriveOAuth2Api implements ICredentialType {
	name = 'microsoftOneDriveOAuth2Api';

	extends = ['microsoftOAuth2Api'];

	displayName = 'Microsoft Drive OAuth2 API';

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'openid offline_access Files.ReadWrite.All',
		},
	];
}
