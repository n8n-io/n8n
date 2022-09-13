import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftToDoOAuth2Api implements ICredentialType {
	name = 'microsoftToDoOAuth2Api';
	extends = ['microsoftOAuth2Api'];
	displayName = 'Microsoft To Do OAuth2 API';
	documentationUrl = 'microsoft';
	properties: INodeProperties[] = [
		//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'openid offline_access Tasks.ReadWrite',
		},
	];
}
