import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class IntercomOAuth2Api implements ICredentialType {
	name = 'intercomOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Intercom OAuth2 API';

	documentationUrl = 'intercom';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://app.intercom.com/oauth',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.intercom.io/auth/eagle/token',
			required: true,
		},
		{
			// Intercom sets permissions in the app settings, not with scope strings.
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
