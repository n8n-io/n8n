import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

const userScopes = [
	'meeting:read',
	'meeting:write',
	'user:read',
	'user:write',
	'user_profile',
	'webinar:read',
	'webinar:write'
];

export class ZoomOAuth2Api implements ICredentialType {
	name = 'zoomOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'Zoom OAuth2 API';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://zoom.us/oauth/authorize'
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://zoom.us/oauth/token'
		},

		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: ''
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: ''
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'header'
		}
	];
}
