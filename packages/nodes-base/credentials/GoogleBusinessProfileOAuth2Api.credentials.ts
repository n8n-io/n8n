import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['https://www.googleapis.com/auth/business.manage'];

export class GoogleBusinessProfileOAuth2Api implements ICredentialType {
	name = 'googleBusinessProfileOAuth2Api';

	extends = ['googleOAuth2Api'];

	displayName = 'Google Business Profile OAuth2 API';

	documentationUrl = 'google/oauth-single-service';

	properties: INodeProperties[] = [
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description: 'Define custom scopes',
		},
		{
			displayName:
				'The default scopes needed for the node to work are already set, If you change these the node may not function correctly.',
			name: 'customScopesNotice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
		},
		{
			displayName: 'Enabled Scopes',
			name: 'enabledScopes',
			type: 'string',
			displayOptions: {
				show: {
					customScopes: [true],
				},
			},
			default: scopes.join(' '),
			description: 'Scopes that should be enabled',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '={{$self["customScopes"] ? $self["enabledScopes"] : "' + scopes.join(' ') + '"}}',
		},
		{
			displayName:
				'Make sure that you have fulfilled the prerequisites and requested access to Google Business Profile API. <a href="https://developers.google.com/my-business/content/prereqs" target="_blank">More info</a>. Also, make sure that you have enabled the following APIs & Services in the Google Cloud Console: Google My Business API, Google My Business Management API. <a href="https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/#scopes" target="_blank">More info</a>.',
			name: 'notice',
			type: 'notice',
			default: '',
			displayOptions: {
				showOnDeployment: 'hosted',
			},
		},
	];
}
