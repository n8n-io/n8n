import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/gmail.labels',
	'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
	'https://www.googleapis.com/auth/gmail.addons.current.message.action',
	'https://mail.google.com/',
	'https://www.googleapis.com/auth/gmail.modify',
	'https://www.googleapis.com/auth/gmail.compose',
];

export class GmailBrokerOAuth2Api implements ICredentialType {
	name = 'gmailBrokerOAuth2Api';

	extends = ['googleOAuth2Api'];

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-display-name-missing-oauth2, n8n-nodes-base/cred-class-field-display-name-miscased
	displayName = 'Gmail OAuth2 API (n8n-managed)';

	documentationUrl = 'google/oauth-single-service';

	icon: Icon = 'node:n8n-nodes-base.gmail';

	managedAuth = {
		type: 'broker' as const,
		provider: 'gmailBrokerOAuth2Api',
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
