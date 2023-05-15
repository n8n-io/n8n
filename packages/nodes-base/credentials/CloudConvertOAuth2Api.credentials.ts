import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['user.read', 'task.read', 'task.write'];

export class CloudConvertOAuth2Api implements ICredentialType {
	name = 'cloudConvertOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'CloudConvert OAuth2 API';

	documentationUrl = 'https://cloudconvert.com/api/v2#authentication';

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
			default: 'https://cloudconvert.com/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://cloudconvert.com/oauth/token',
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
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];
}
