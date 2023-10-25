import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['https://www.googleapis.com/auth/contacts'];

export class GoogleContactsOAuth2Api implements ICredentialType {
	name = 'googleContactsOAuth2Api';

	extends = ['googleOAuth2Api'];

	displayName = 'Google Contacts OAuth2 API';

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
