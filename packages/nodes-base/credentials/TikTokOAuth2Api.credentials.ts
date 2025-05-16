import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['user.info.basic', 'video.publish', 'video.upload'];

export class TikTokOAuth2Api implements ICredentialType {
	name = 'tikTokOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'TikTok OAuth2 API';
	documentationUrl = 'https://developers.tiktok.com/doc/login-kit-web/';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: `${scopes.join(',')}`,
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'pkce',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://www.tiktok.com/v2/auth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://open.tiktokapis.com/v2/oauth/token/',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		{
			displayName: 'Client Key',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '={{"client_key=" + $self.clientId}}',
		},
		{
			displayName: 'Additional Body Properties',
			name: 'additionalBodyProperties',
			type: 'hidden',
			default: `={{'{"client_key":"' + $self.clientId + '", "client_secret":"' + $self.clientSecret + '"}'}}`,
		},
		{
			displayName: 'PKCE Challenge Format',
			name: 'pkceChallengeFormat',
			type: 'hidden',
			default: 'hex',
		},
	];
}
