import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

import { atlassianScopes } from './common/atlassian-scopes';

const defaultScopes = atlassianScopes;

export class AtlassianOAuth2Api implements ICredentialType {
	name = 'atlassianOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Atlassian OAuth2 API';

	documentationUrl = 'atlassian';

	properties: INodeProperties[] = [
		{
			// Named `domain` (not `siteUrl`) so existing Jira OAuth2 credentials,
			// which store the value under this key, keep working.
			displayName: 'Site URL',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://your-site.atlassian.net',
			required: true,
			description:
				'The URL of your Atlassian site, e.g. https://your-site.atlassian.net. The scheme and any path (like /wiki) are ignored.',
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
			default: 'https://auth.atlassian.com/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://auth.atlassian.com/oauth/token',
			required: true,
		},
		{
			// `prompt=consent` forces the Atlassian consent screen (which shows the
			// active account and offers a switch) instead of a silent re-auth.
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'audience=api.atlassian.com&prompt=consent',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
		{
			displayName: 'Custom Scopes',
			name: 'customScopes',
			type: 'boolean',
			default: false,
			description: 'Define custom scopes',
		},
		{
			displayName:
				'The default scopes needed for the node to work are already set. If you change these the node may not function correctly.',
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
			default: defaultScopes.join(' '),
			description: 'Scopes that should be enabled',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'={{$self["customScopes"] ? $self["enabledScopes"] : "' + defaultScopes.join(' ') + '"}}',
		},
	];

	// Credential tests don't inherit through `extends`, so extending credentials
	// need their own test block; this one covers users creating the base directly.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.atlassian.com',
			url: '/oauth/token/accessible-resources',
			method: 'GET',
		},
	};
}
