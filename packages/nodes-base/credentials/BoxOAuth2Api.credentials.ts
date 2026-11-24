import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class BoxOAuth2Api implements ICredentialType {
	name = 'boxOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Box OAuth2 API';

	documentationUrl = 'box';

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
			default: 'https://account.box.com/api/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.box.com/oauth2/token',
			required: true,
		},
		{
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
		{
			displayName: 'Primary Signature Key',
			name: 'signingKeyPrimary',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				"Used to verify the authenticity of webhook requests. Find it in the Box Developer Console under your app's Webhooks tab > Manage signature keys.",
		},
		{
			displayName: 'Secondary Signature Key',
			name: 'signingKeySecondary',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				"Used to verify the authenticity of webhook requests during key rotation. Find it in the Box Developer Console under your app's Webhooks tab > Manage signature keys.",
		},
	];
}
