import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

const scopes = [
	'read',
	'write',
];

export class ZendeskOAuth2Api implements ICredentialType {
	name = 'zendeskOAuth2Api';
	extends = [
		'oAuth2Api',
	];
	displayName = 'Zendesk OAuth2 API';
	documentationUrl = 'zendesk';
	properties = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'n8n',
			description: 'The subdomain of your Zendesk work environment.',
			required: true,
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden' as NodePropertyTypes,
			default: '=https://{{$self["subdomain"]}}.zendesk.com/oauth/authorizations/new',
			description: 'URL to get authorization code. Replace {SUBDOMAIN_HERE} with your subdomain.',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden' as NodePropertyTypes,
			default: '=https://{{$self["subdomain"]}}.zendesk.com/oauth/tokens',
			description: 'URL to get access token. Replace {SUBDOMAIN_HERE} with your subdomain.',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden' as NodePropertyTypes,
			default: scopes.join(' '),
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden' as NodePropertyTypes,
			default: '',
			description: 'For some services additional query parameters have to be set which can be defined here.',
			placeholder: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden' as NodePropertyTypes,
			default: 'body',
			description: 'Resource to consume.',
		},
	];
}
