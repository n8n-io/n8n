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
	];
}
