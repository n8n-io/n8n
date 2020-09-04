import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class DropboxOAuth2Api implements ICredentialType {
	name = 'dropboxOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Dropbox OAuth2 API';
	documentationUrl = 'dropbox';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://www.dropbox.com/oauth2/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://api.dropboxapi.com/oauth2/token',
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
			default: 'header',
		},
	];
}
