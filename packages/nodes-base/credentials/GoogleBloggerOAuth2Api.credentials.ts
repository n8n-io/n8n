import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/blogger',
	'https://www.googleapis.com/auth/blogger.readonly',
];

export class GoogleBloggerOAuth2Api implements ICredentialType {
	name = 'googleBloggerOAuth2Api';

	extends = ['googleOAuth2Api'];

	displayName = 'Google Blogger OAuth2 API';

	documentationUrl = 'google/oauth-single-service';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];
}