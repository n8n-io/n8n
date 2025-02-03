import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class MiroOAuth2Api implements ICredentialType {
	name = 'miroOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Miro OAuth2 API';

	documentationUrl = 'miro';

	icon: Icon = 'file:icons/Miro.svg';

	httpRequestNode = {
		name: 'Miro',
		docsUrl: 'https://developers.miro.com/reference/overview',
		apiBaseUrl: 'https://api.miro.com/v2/',
	};

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
			default: 'https://miro.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.miro.com/v1/oauth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
			required: true,
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
