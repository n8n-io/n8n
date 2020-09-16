import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MicrosoftTeamsOAuth2Api implements ICredentialType {
	name = 'microsoftTeamsOAuth2Api';
	extends = [
		'microsoftOAuth2Api',
	];
	displayName = 'Microsoft OAuth2 API';
	properties = [
		//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'openid offline_access User.ReadWrite.All Group.ReadWrite.All',
		},
	];
}
