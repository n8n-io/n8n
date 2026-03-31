import { z } from 'zod';

/** RFC 8693 grant type URN for token exchange */
export const TOKEN_EXCHANGE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange' as const;

/**
 * Validates JWT claims originating from an external identity provider.
 * Required: sub, iss (must be a valid URL), aud, iat, exp, jti
 * Optional: email (must be valid email format), given_name, family_name, role
 */
export const ExternalTokenClaimsSchema = z.object({
	sub: z.string().min(1),
	iss: z.string().url(),
	aud: z.union([z.string(), z.array(z.string())]),
	iat: z.number().int(),
	exp: z.number().int(),
	jti: z.string().min(1),
	email: z.string().email().optional(),
	given_name: z.string().optional(),
	family_name: z.string().optional(),
	role: z.union([z.string(), z.array(z.string())]).optional(),
});

export type ExternalTokenClaims = z.infer<typeof ExternalTokenClaimsSchema>;

/**
 * Validates a trusted key source configuration.
 * Discriminated union on 'type':
 *   - 'static': inline public key with kid, algorithms, key, issuer
 *   - 'jwks':   remote JWKS endpoint with url, issuer, optional cache TTL
 */
export const TrustedKeySourceSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('static'),
		kid: z.string().min(1),
		algorithms: z.array(z.string()).min(1),
		key: z.string().min(1),
		issuer: z.string().min(1),
		allowedRoles: z.array(z.string()).optional(),
	}),
	z.object({
		type: z.literal('jwks'),
		url: z.string().url(),
		issuer: z.string().min(1),
		allowedRoles: z.array(z.string()).optional(),
		cacheTtlSeconds: z.number().int().positive().optional(),
	}),
]);

export type TrustedKeySource = z.infer<typeof TrustedKeySourceSchema>;
export type StaticKeySource = Extract<TrustedKeySource, { type: 'static' }>;
export type JwksKeySource = Extract<TrustedKeySource, { type: 'jwks' }>;

/**
 * Validates an RFC 8693 token exchange request form body.
 * grant_type must be the token-exchange URN; subject_token is required.
 */
export const TokenExchangeRequestSchema = z.object({
	grant_type: z.literal(TOKEN_EXCHANGE_GRANT_TYPE),
	subject_token: z.string().min(1),
	subject_token_type: z.string().optional(),
	actor_token: z.string().optional(),
	actor_token_type: z.string().optional(),
	requested_token_type: z.string().optional(),
	scope: z.string().optional(),
	audience: z.string().optional(),
	resource: z.string().optional(),
});

export type TokenExchangeRequest = z.infer<typeof TokenExchangeRequestSchema>;
