import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['https://www.googleapis.com/auth/business.manage'];

export class GoogleMyBusinessOAuth2Api implements ICredentialType {
	name = 'googleMyBusinessOAuth2Api';

	extends = ['googleOAuth2Api'];

	displayName = 'Google My Business OAuth2 API';

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
