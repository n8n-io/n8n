import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['https://www.googleapis.com/auth/books'];

export class GoogleBooksOAuth2Api implements ICredentialType {
	name = 'googleBooksOAuth2Api';

	extends = ['googleOAuth2Api'];

	displayName = 'Google Books OAuth2 API';

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
