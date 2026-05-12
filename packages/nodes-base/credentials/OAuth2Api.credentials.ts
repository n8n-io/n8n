import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class OAuth2Api implements ICredentialType {
	name = 'oAuth2Api';

	displayName = 'OAuth2 API';

	documentationUrl = 'httprequest';

	genericAuth = true;

	properties: INodeProperties[] = [
		{
			displayName: 'Use Dynamic Client Registration',
			name: 'useDynamicClientRegistration',
			type: 'hidden',
			default: false,
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'options',
			displayOptions: {
				show: {
					useDynamicClientRegistration: [false],
				},
			},
			options: [
				{
					name: 'Authorization Code',
					value: 'authorizationCode',
				},
				{
					name: 'Client Credentials',
					value: 'clientCredentials',
				},
				{
					name: 'PKCE',
					value: 'pkce',
				},
			],
			default: 'authorizationCode',
		},
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'string',
			displayOptions: {
				show: {
					useDynamicClientRegistration: [true],
				},
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string',
			displayOptions: {
				show: {
					grantType: ['authorizationCode', 'pkce'],
					useDynamicClientRegistration: [false],
				},
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			displayOptions: {
				show: {
					useDynamicClientRegistration: [false],
				},
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			displayOptions: {
				show: {
					useDynamicClientRegistration: [false],
				},
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			displayOptions: {
				show: {
					useDynamicClientRegistration: [false],
				},
			},
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		// WARNING: if you are extending from this credentials and allow user to set their own scopes
		// you HAVE TO add it to GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE in packages/cli/src/constants.ts
		// track any updates to this behavior in N8N-7424
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			displayOptions: {
				show: {
					useDynamicClientRegistration: [false],
				},
			},
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'string',
			displayOptions: {
				show: {
					grantType: ['authorizationCode', 'pkce'],
					useDynamicClientRegistration: [false],
				},
			},
			default: '',
			description:
				'For some services additional query parameters have to be set which can be defined here',
			placeholder: 'access_type=offline',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			displayOptions: {
				show: {
					useDynamicClientRegistration: [false],
				},
			},
			options: [
				{
					name: 'Body',
					value: 'body',
					description: 'Send credentials in body',
				},
				{
					name: 'Header',
					value: 'header',
					description: 'Send credentials as Basic Auth header',
				},
			],
			default: 'header',
		},
		{
			displayName: 'Send Additional Body Properties',
			name: 'sendAdditionalBodyProperties',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					grantType: ['clientCredentials'],
					authentication: ['body'],
					useDynamicClientRegistration: [false],
				},
			},
		},
		{
			displayName: 'Additional Body Properties',
			name: 'additionalBodyProperties',
			type: 'json',
			typeOptions: {
				rows: 5,
			},
			displayOptions: {
				show: {
					grantType: ['clientCredentials'],
					authentication: ['body'],
					sendAdditionalBodyProperties: [true],
					useDynamicClientRegistration: [false],
				},
			},
			default: '',
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'ignoreSSLIssues',
			type: 'boolean',
			default: false,
			doNotInherit: true,
		},
		{
			displayName: 'Token Expired Status Code',
			name: 'tokenExpiredStatusCode',
			type: 'number',
			default: 401,
			description:
				'HTTP status code that indicates the token has expired. Some APIs return 403 instead of 401.',
			doNotInherit: true,
		},
		{
			displayName: 'Encrypted Tokens (JWE)',
			name: 'jweEnabled',
			type: 'boolean',
			default: false,
			description:
				'Whether the IdP returns tokens encrypted as JWE to the public key at this instance’s JWKS endpoint. The response must contain at least one JWE-encrypted token (access or ID token); fully plaintext responses are rejected. The field is hidden by the server unless the OAuth2 JWE feature is enabled.',
			doNotInherit: true,
		},
		{
			// `displayName` is filled in at runtime by FrontendService with the
			// instance JWKS URI. Server-side gating drops both this notice and
			// the toggle above when the OAuth2 JWE feature flag is off.
			displayName: '',
			name: 'jwksUriNotice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					jweEnabled: [true],
				},
			},
			doNotInherit: true,
		},
	];
}
