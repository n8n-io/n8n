import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['https://www.googleapis.com/auth/cloud-translation'];

export class GoogleTranslateOAuth2Api implements ICredentialType {
	name = 'googleTranslateOAuth2Api';

	extends = ['googleOAuth2Api'];

	displayName = 'Google Translate OAuth2 API';

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
