import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'attachments:write',
	'channels:remove',
	'comments:remove',
	'messages:remove',
	'threads:remove',
	'workspaces:read',
];

export class TwistOAuth2Api implements ICredentialType {
	name = 'twistOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Twist OAuth2 API';

	documentationUrl = 'twist';

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
			default: 'https://twist.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://twist.com/oauth/access_token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(','),
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
