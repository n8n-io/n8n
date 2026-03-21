import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class CalendlyOAuth2Api implements ICredentialType {
	name = 'calendlyOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Calendly OAuth2 API';

	documentationUrl = 'calendly';

	icon: Icon = 'file:icons/Calendly.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://auth.calendly.com/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://auth.calendly.com/oauth/token',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: 'user:read bookings:read bookings:manage webhooks:read webhooks:write',
			description: 'The scopes required to run your integration. Space-separated.',
		},
		{
			displayName: 'Webhook Signing Key',
			name: 'webhookSigningKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'A unique key shared between your app and Calendly used to verify events sent to your endpoints',
		},
	];
}
