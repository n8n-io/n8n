import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class NextCloudOAuth2Api implements ICredentialType {
	name = 'nextCloudOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'NextCloud OAuth2 API';
	properties = [
		{
			displayName: 'Web DAV URL',
			name: 'webDavUrl',
			type: 'string' as NodePropertyTypes,
			placeholder: 'https://nextcloud.example.com/remote.php/webdav',
			default: '',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string' as NodePropertyTypes,
			default: 'https://nextcloud.example.com/apps/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string' as NodePropertyTypes,
			default: 'https://nextcloud.example.com/apps/oauth2/api/v1/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'body',
		},
	];
}
