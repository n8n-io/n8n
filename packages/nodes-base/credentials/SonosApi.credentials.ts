import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SonosApi implements ICredentialType {
	name = 'sonosApi';
	extends = [
		'oAuth2Api',
	];
	icon = 'file:Sonos.svg';
	displayName = 'Sonos API';
	properties: INodeProperties[] = [	
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string',
			default: 'https://api.sonos.com/login/v3/oauth',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			default: 'https://${clientId}:${clientSecret}@api.sonos.com/login/v3/oauth/access',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'playback-control-all'
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		}
	];
}
