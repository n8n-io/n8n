import type { ICredentialType, INodeProperties } from 'n8n-workflow';

// TODO(ENT-28): Revisit during M1 build whether these OIDC settings belong in a
// credential (reusable, encrypted, current choice) or inline on the trigger
// node. See tasks/plan.md "Resolved Decisions" #1.

// This credential authenticates *incoming* requests to a trigger, so it has no
// `authenticate` block (that is only for outgoing API calls). The trigger reads
// these fields and validates the caller's bearer token via
// @n8n/oauth2-token-validator.
// eslint-disable-next-line n8n-nodes-base/cred-class-name-unsuffixed
export class OAuth2OidcBearer implements ICredentialType {
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-name-unsuffixed
	name = 'oAuth2OidcBearer';

	displayName = 'OAuth2/OIDC Bearer Token';

	documentationUrl = 'httprequest';

	properties: INodeProperties[] = [
		{
			displayName: 'Validation Method',
			name: 'validationMethod',
			type: 'options',
			options: [
				{
					name: 'JWT (Validate Signature via JWKS)',
					value: 'jwks',
					description:
						'Verify the token signature locally using the IdP public keys. Fast, no per-request network call.',
				},
				{
					name: 'Introspection (RFC 7662)',
					value: 'introspection',
					description:
						'Ask the IdP to validate the token on each request. Supports opaque tokens and instant revocation.',
				},
			],
			default: 'jwks',
		},
		{
			displayName: 'Issuer URL',
			name: 'issuer',
			type: 'string',
			default: '',
			placeholder: 'https://your-tenant.okta.com',
			required: true,
			description:
				'The token issuer. Used to discover the JWKS endpoint via /.well-known/openid-configuration and to validate the "iss" claim.',
		},
		{
			displayName: 'Audience',
			name: 'audience',
			type: 'string',
			default: '',
			placeholder: 'n8n',
			description: 'Expected "aud" claim. Leave empty to skip audience validation.',
		},
		{
			displayName: 'JWKS URI (Optional Override)',
			name: 'jwksUri',
			type: 'string',
			default: '',
			placeholder: 'https://your-tenant.okta.com/oauth2/v1/keys',
			description: 'Explicit JWKS endpoint. Leave empty to auto-discover from the issuer.',
			displayOptions: {
				show: {
					validationMethod: ['jwks'],
				},
			},
		},
		{
			displayName: 'Claim Access Rules',
			name: 'claimRules',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			placeholder: 'Add Rule',
			description:
				'Optional allow/deny rules evaluated against the token claims (deny-wins). Leave empty to allow any validly-signed token from the issuer. When rules are present, access is denied unless an allow rule matches and no deny rule matches.',
			options: [
				{
					name: 'rule',
					displayName: 'Rule',
					values: [
						{
							displayName: 'Effect',
							name: 'effect',
							type: 'options',
							options: [
								{ name: 'Allow', value: 'allow' },
								{ name: 'Deny', value: 'deny' },
							],
							default: 'allow',
						},
						{
							displayName: 'Expression',
							name: 'expression',
							type: 'string',
							default: '',
							// Stored verbatim: n8n eagerly resolves "="-prefixed field values
							// at credential-load time, which would consume the rule expression
							// before it reaches the trigger. noDataExpression keeps it literal.
							noDataExpression: true,
							placeholder: '{{ $claims.groups.includes("admin") }}',
							description:
								'Condition evaluated against the token claims, in n8n expression syntax. The claims are available as $claims (e.g. {{ $claims.groups.includes("admin") }}). Enter it as plain text; do not prefix with "=".',
						},
					],
				},
			],
		},
	];
}
