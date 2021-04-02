import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class TodoistOAuth2Api implements ICredentialType {
	name = 'todoistOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Todoist OAuth2 API';
	documentationUrl = 'todoist';
	properties = [
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://todoist.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: 'https://todoist.com/oauth/access_token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: 'data:read_write,data:delete',
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
