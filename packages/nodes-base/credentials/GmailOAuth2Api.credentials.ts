import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/gmail.labels',
	'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
	'https://www.googleapis.com/auth/gmail.addons.current.message.action',
	'https://mail.google.com/',
	'https://www.googleapis.com/auth/gmail.modify',
	'https://www.googleapis.com/auth/gmail.compose',
];

export class GmailOAuth2Api implements ICredentialType {
	name = 'gmailOAuth2';

	extends = ['googleOAuth2Api'];

	displayName = 'Gmail OAuth2 API';

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
