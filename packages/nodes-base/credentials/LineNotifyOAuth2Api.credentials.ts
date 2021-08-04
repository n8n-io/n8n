import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LineNotifyOAuth2Api implements ICredentialType {
	name = 'lineNotifyOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Line Notify OAuth2 API';
	documentationUrl = 'line';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://notify-bot.line.me/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://notify-bot.line.me/oauth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'notify',
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
