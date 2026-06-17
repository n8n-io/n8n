import type { Secret } from 'jsonwebtoken';
import { z } from 'zod';

/** RFC 8693 grant type URN for token exchange */
export const TOKEN_EXCHANGE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange' as const;

/**
 * Asymmetric-only JWT algorithms accepted for trusted key sources.
 * Symmetric (HMAC) and 'none' are excluded by design.
 */
export const JwtAlgorithmSchema = z.enum([
	'RS256',
	'RS384',
	'RS512',
	'ES256',
	'ES384',
	'ES512',
	'PS256',
	'PS384',
	'PS512',
	'EdDSA',
]);

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
	nbf: z.number().int().optional(),
	email: z.string().email().optional(),
	given_name: z.string().optional(),
	family_name: z.string().optional(),
	role: z.string().optional(),
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
		algorithms: z.array(JwtAlgorithmSchema).min(1),
		key: z.string().min(1),
		issuer: z.string().min(1),
		expectedAudience: z.string().optional(),
		allowedRoles: z.array(z.string()).optional(),
	}),
	z.object({
		type: z.literal('jwks'),
		url: z.string().url(),
		issuer: z.string().min(1),
		expectedAudience: z.string().optional(),
		allowedRoles: z.array(z.string()).optional(),
		cacheTtlSeconds: z.number().int().positive().optional(),
	}),
]);

export type TrustedKeySource = z.infer<typeof TrustedKeySourceSchema>;
export type StaticKeySource = Extract<TrustedKeySource, { type: 'static' }>;
export type JwksKeySource = Extract<TrustedKeySource, { type: 'jwks' }>;

export type JwtAlgorithm = z.infer<typeof JwtAlgorithmSchema>;
export type TrustedKeySourceType = 'static' | 'jwks';
export type TrustedKeySourceStatus = 'pending' | 'healthy' | 'error';

/**
 * Serializable representation of a trusted key stored in the `trusted_key.data`
 * JSON column. Unlike `ResolvedTrustedKey`, this holds the raw PEM string
 * instead of a live `crypto.KeyObject`.
 */
export const TrustedKeyDataSchema = z.object({
	algorithms: z.array(JwtAlgorithmSchema).min(1),
	keyMaterial: z.string().min(1),
	issuer: z.string().min(1),
	expectedAudience: z.string().optional(),
	allowedRoles: z.array(z.string()).optional(),
	expiresAt: z.string().optional(),
});

export type TrustedKeyData = z.infer<typeof TrustedKeyDataSchema>;

/**
 * A trusted key that has been normalized and resolved to an in-memory
 * representation ready for JWT verification. The raw key material from
 * the config/persistence layer (string PEM, JWKS endpoint, etc.) has
 * already been parsed into a type accepted by `jwt.verify()`.
 */
export interface ResolvedTrustedKey {
	/** The Key ID that identifies this key in JWT headers. */
	kid: string;

	/** Allowed signing algorithms for tokens using this key. */
	algorithms: JwtAlgorithm[];

	/** The resolved key material, ready to pass to `jwt.verify()`. */
	key: Secret;

	/** Expected `iss` claim value for tokens signed with this key. */
	issuer: string;

	/** Expected `aud` claim value, if restricted. */
	expectedAudience?: string;

	/** Roles allowed for tokens signed with this key, if restricted. */
	allowedRoles?: string[];
}

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
	scope: z.string().max(1024).optional(),
	audience: z.string().max(1024).optional(),
	resource: z.string().max(2048).optional(),
});

export type TokenExchangeRequest = z.infer<typeof TokenExchangeRequestSchema>;
