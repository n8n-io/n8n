import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class WebhookOAuth2Authentication implements ICredentialType {
	name = 'webhookOAuth2Authentication';

	displayName = 'Webhook OAuth2 Authentication';

	extends = ['oAuth2Api'];

	properties: INodeProperties[] = [
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			displayOptions: {
				hide: {
					grantType: ['pkce'],
				},
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
		// Hidden fields: inherited from oAuth2Api but not applicable here.
		// Token requests always use the Authorization header — there's no UI path that needs `body` mode.
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		// Domain restrictions only apply to credentials reused in HTTP Request nodes.
		// This credential authenticates form visitors; it doesn't make outbound HTTP requests on a user's behalf.
		{
			displayName: 'Allowed HTTP Request Domains',
			name: 'allowedHttpRequestDomains',
			type: 'hidden',
			default: 'none',
		},
	];
}
