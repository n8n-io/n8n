import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PipedriveOAuth2Api implements ICredentialType {
	name = 'pipedriveOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Pipedrive OAuth2 API';
	documentationUrl = 'pipedrive';
	properties: INodeProperties[] = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://oauth.pipedrive.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://oauth.pipedrive.com/oauth/token',
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
			default: 'header',
		},
	];
}
