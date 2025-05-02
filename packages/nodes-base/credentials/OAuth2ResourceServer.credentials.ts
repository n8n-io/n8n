import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export type OAuth2ResourceServerCredential = {
	authorizationServerUrl: string;
} & (
	| {
			tokenValidationMethod: 'introspection';
			introspectionEndpoint: string;
			tokenTypeHint: string;
			clientId: string;
			clientSecret: string;
	  }
	| {
			tokenValidationMethod: 'jwt';
			jwksEndpoint: string;
	  }
);

// eslint-disable-next-line n8n-nodes-base/cred-class-name-unsuffixed
export class OAuth2ResourceServer implements ICredentialType {
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-name-unsuffixed
	name = 'oAuth2ResourceServer';

	displayName = 'OAuth 2 Resource Server';

	documentationUrl = 'oAuth2ResourceServer';

	properties: INodeProperties[] = [
		{
			displayName: 'Authorization Server URL',
			name: 'authorizationServerUrl',
			type: 'string',
			default: '',
			required: true,
			description: 'Base URL of the OAuth2 authorization server',
		},
		{
			displayName: 'Token Validation Method',
			name: 'tokenValidationMethod',
			type: 'options',
			options: [
				{
					name: 'Introspection Endpoint',
					value: 'introspection',
					description:
						"Validate tokens by calling the authorization server's introspection endpoint",
				},
				{
					name: 'Local JWT Validation',
					value: 'jwt',
					description: 'Validate JWT tokens locally using the provided JWKS endpoint',
				},
			],
			default: 'introspection',
			description: 'Method to use for validating access tokens',
		},
		{
			displayName: 'Introspection Endpoint',
			name: 'introspectionEndpoint',
			type: 'string',
			default: '/token',
			description:
				'URL of the token introspection endpoint. This can either be a relative URL on the Authorization Server, or an absolute URL.',
			displayOptions: {
				show: {
					tokenValidationMethod: ['introspection'],
				},
			},
		},
		{
			displayName: 'Token Type Hint',
			name: 'tokenTypeHint',
			// eslint-disable-next-line n8n-nodes-base/cred-class-field-type-options-password-missing
			type: 'string',
			default: 'access_token',
			description: 'A hint about the type of token that is submitted for introspection.',
			displayOptions: {
				show: {
					tokenValidationMethod: ['introspection'],
				},
			},
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			description: 'Client ID for token introspection authentication',
			displayOptions: {
				show: {
					tokenValidationMethod: ['introspection'],
				},
			},
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Client secret for token introspection authentication',
			displayOptions: {
				show: {
					tokenValidationMethod: ['introspection'],
				},
			},
		},
		{
			displayName: 'JWKS Endpoint',
			name: 'jwksEndpoint',
			type: 'string',
			default: '/oauth2/jwks',
			displayOptions: {
				show: {
					tokenValidationMethod: ['jwt'],
				},
			},
			description:
				'URL of the JWKS endpoint for JWT validation. This can either be a relative URL on the Authorization Server, or an absolute URL.',
		},
	];
}
