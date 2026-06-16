import type { ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class WebhookOAuth2Api implements ICredentialType {
	name = 'webhookOAuth2Api';

	displayName = 'Webhook OAuth2 API';

	documentationUrl = 'https://docs.n8n.io/api/authentication/';

	icon: Icon = 'node:n8n-nodes-base.formTrigger';

	extends = ['oAuth2Api'];

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'options',
			options: [
				{
					name: 'Authorization Code',
					value: 'authorizationCode',
				},
				{
					name: 'PKCE',
					value: 'pkce',
				},
			],
			default: 'authorizationCode',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			displayOptions: {
				hide: { grantType: ['pkce'] },
			},
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Optional for public clients (native/mobile/SPA apps). Required by some providers even with PKCE — e.g. Google "Web application" clients.',
			displayOptions: {
				show: { grantType: ['pkce'] },
			},
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: 'openid profile email',
			description:
				'Include <code>openid profile email</code> to display user information in the "Logged in As" banner. Without <code>openid</code> no user data can be retrieved.',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		{
			displayName: 'Allowed HTTP Request Domains',
			name: 'allowedHttpRequestDomains',
			type: 'hidden',
			default: 'none',
		},
	];
}
