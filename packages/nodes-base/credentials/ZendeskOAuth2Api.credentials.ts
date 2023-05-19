import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['read', 'write'];

export class ZendeskOAuth2Api implements ICredentialType {
	name = 'zendeskOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Zendesk OAuth2 API';

	documentationUrl = 'zendesk';

	properties: INodeProperties[] = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			placeholder: 'n8n',
			description: 'The subdomain of your Zendesk work environment',
			required: true,
		},
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
			default: '=https://{{$self["subdomain"]}}.zendesk.com/oauth/authorizations/new',
			description: 'URL to get authorization code. Replace {SUBDOMAIN_HERE} with your subdomain.',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '=https://{{$self["subdomain"]}}.zendesk.com/oauth/tokens',
			description: 'URL to get access token. Replace {SUBDOMAIN_HERE} with your subdomain.',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
			description:
				'For some services additional query parameters have to be set which can be defined here',
			placeholder: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
