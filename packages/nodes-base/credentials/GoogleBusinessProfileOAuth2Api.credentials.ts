import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['https://www.googleapis.com/auth/business.manage'];

export class GoogleBusinessProfileOAuth2Api implements ICredentialType {
	name = 'googleBusinessProfileOAuth2Api';

	extends = ['googleOAuth2Api'];

	displayName = 'Google Business Profile OAuth2 API';

	documentationUrl = 'google/oauth-single-service';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
		{
			displayName:
				'Make sure that you have fulfilled the prerequisites and requested access to Google Business Profile API. <a href="https://developers.google.com/my-business/content/prereqs" target="_blank">More info</a>. Also, make sure that you have enabled the following APIs & Services in the Google Cloud Console: Google My Business API, Google My Business Management API. <a href="https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/#scopes" target="_blank">More info</a>.',
			name: 'notice',
			type: 'notice',
			default: '',
		},
	];
}
