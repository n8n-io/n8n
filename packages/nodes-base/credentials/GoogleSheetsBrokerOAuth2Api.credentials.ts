import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/drive.file',
	'https://www.googleapis.com/auth/spreadsheets',
	'https://www.googleapis.com/auth/drive.metadata',
];

export class GoogleSheetsBrokerOAuth2Api implements ICredentialType {
	name = 'googleSheetsBrokerOAuth2Api';

	extends = ['googleOAuth2Api'];

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-display-name-missing-oauth2, n8n-nodes-base/cred-class-field-display-name-miscased
	displayName = 'Google Sheets OAuth2 API (n8n-managed)';

	documentationUrl = 'google/oauth-single-service';

	icon: Icon = 'node:n8n-nodes-base.googleSheets';

	managedAuth = {
		type: 'broker' as const,
		provider: 'googleSheetsBrokerOAuth2Api',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];
}
