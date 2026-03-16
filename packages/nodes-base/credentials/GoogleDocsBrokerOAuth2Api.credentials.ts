import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/documents',
	'https://www.googleapis.com/auth/drive',
	'https://www.googleapis.com/auth/drive.file',
];

export class GoogleDocsBrokerOAuth2Api implements ICredentialType {
	name = 'googleDocsBrokerOAuth2Api';

	extends = ['googleOAuth2Api'];

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-display-name-missing-oauth2, n8n-nodes-base/cred-class-field-display-name-miscased
	displayName = 'Google Docs OAuth2 API (n8n-managed)';

	documentationUrl = 'google/oauth-single-service';

	icon: Icon = 'node:n8n-nodes-base.googleDocs';

	managedAuth = {
		type: 'broker' as const,
		provider: 'googleDocsBrokerOAuth2Api',
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
