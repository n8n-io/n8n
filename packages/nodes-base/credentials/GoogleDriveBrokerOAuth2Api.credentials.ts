import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/drive',
	'https://www.googleapis.com/auth/drive.appdata',
	'https://www.googleapis.com/auth/drive.photos.readonly',
];

export class GoogleDriveBrokerOAuth2Api implements ICredentialType {
	name = 'googleDriveBrokerOAuth2Api';

	extends = ['googleOAuth2Api'];

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-display-name-missing-oauth2, n8n-nodes-base/cred-class-field-display-name-miscased
	displayName = 'Google Drive OAuth2 API (n8n-managed)';

	documentationUrl = 'google/oauth-single-service';

	icon: Icon = 'file:icons/Google.svg';

	managedAuth = {
		type: 'broker' as const,
		provider: 'googleDriveBrokerOAuth2Api',
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
