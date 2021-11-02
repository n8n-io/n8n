import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VideoAskOAuth2Api implements ICredentialType {
	name = 'videoAskOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'VideoAsk OAuth2 API';
	documentationUrl = 'videoAsk';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://auth.videoask.com/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://auth.videoask.com/oauth/token',
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
			default: 'header',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
	];
}
