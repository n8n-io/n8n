import type { Secret } from 'jsonwebtoken';
import { z } from 'zod';

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
	email_verified: z
		.union([z.boolean(), z.enum(['true', 'false'])])
		.transform((v) => v === true || v === 'true')
		.optional(),
});

export type ExternalTokenClaims = z.infer<typeof ExternalTokenClaimsSchema>;

/**
 * Same claims as `ExternalTokenClaimsSchema`, but `jti` is optional.
 * Some providers (e.g. Entra ID) don't emit `jti` on access tokens; used by
 * callers that don't rely on JTI-based replay protection.
 */
export const ResourceServerTokenClaimsSchema = ExternalTokenClaimsSchema.extend({
	jti: z.string().min(1).optional(),
});

export type ResourceServerTokenClaims = z.infer<typeof ResourceServerTokenClaimsSchema>;

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
		requireVerifiedEmail: z.boolean().optional(),
		expectedAudience: z.string().optional(),
		allowedRoles: z.array(z.string()).optional(),
		subjectClaim: z.string().optional(),
		inboundAudiences: z.array(z.string()).optional(),
	}),
	z.object({
		type: z.literal('jwks'),
		url: z.string().url(),
		issuer: z.string().min(1),
		requireVerifiedEmail: z.boolean().optional(),
		expectedAudience: z.string().optional(),
		allowedRoles: z.array(z.string()).optional(),
		cacheTtlSeconds: z.number().int().positive().optional(),
		subjectClaim: z.string().optional(),
		inboundAudiences: z.array(z.string()).optional(),
	}),
]);

export type TrustedKeySource = z.infer<typeof TrustedKeySourceSchema>;
export type StaticKeySource = Extract<TrustedKeySource, { type: 'static' }>;
export type JwksKeySource = Extract<TrustedKeySource, { type: 'jwks' }>;

export type JwtAlgorithm = z.infer<typeof JwtAlgorithmSchema>;
export type TrustedKeySourceType = 'static' | 'jwks';
export type TrustedKeySourceStatus = 'pending' | 'healthy' | 'error';

/**
 * Provenance of a trusted key source row:
 *   - 'env-config': written by `TrustedKeySyncService.syncSourcesToDb` from the
 *     `N8N_TRUSTED_KEYS` env var. Orphan rows of this provenance are deleted
 *     when no longer present in config.
 *   - 'sso-derived': written from an SSO provider's discovery document
 *     (e.g. OIDC). Never touched by the env-config orphan sweep.
 */
export type TrustedKeySourceManagedBy = 'env-config' | 'sso-derived' | 'api';

/**
 * Admin-set overrides applied on top of a source's derived `config` when its
 * keys are resolved. Stored in the source's own `policy` column, which no
 * refresh path writes, so a discovery re-read or an `N8N_TRUSTED_KEYS` sync
 * can't silently undo an admin's decision.
 *
 * Every field is optional and means "leave the derived value alone" when
 * absent — an admin overrides the settings they care about, not the whole
 * source.
 */
export const TrustedKeySourcePolicySchema = z.object({
	expectedAudience: z.string().optional(),
	inboundAudiences: z.array(z.string()).optional(),
	subjectClaim: z.string().optional(),
	requireVerifiedEmail: z.boolean().optional(),
	allowedRoles: z.array(z.string()).optional(),
});

export type TrustedKeySourcePolicy = z.infer<typeof TrustedKeySourcePolicySchema>;

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
	requireVerifiedEmail: z.boolean().optional(),
	subjectClaim: z.string().optional(),
	inboundAudiences: z.array(z.string()).optional(),
});

export type TrustedKeyData = z.infer<typeof TrustedKeyDataSchema>;

/**
 * A trusted key that has been normalized and resolved to an in-memory
 * representation ready for JWT verification. The raw key material from
 * the config/persistence layer (string PEM, JWKS endpoint, etc.) has
 * already been parsed into a type accepted by `jwt.verify()`.
 */
export interface ResolvedTrustedKey {
	/** The trusted key source this key resolved from. */
	sourceId: string;

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

	/**
	 * Extra `aud` values accepted when the token is presented *directly* to
	 * n8n as a resource server (inbound bearer on a webhook or a
	 * credential-connect route), on top of whatever audience the caller
	 * expects.
	 *
	 * Kept separate from `expectedAudience` — which is the audience of the
	 * one-shot exchange grant — so registering an inbound audience never
	 * widens what the exchange endpoint accepts, or vice versa.
	 *
	 * Always configured, never derived: what an IdP puts in `aud` isn't in its
	 * discovery document and varies by token type and vendor (see
	 * `IdentitySubstrateConfig.ssoInboundAudiences`).
	 */
	inboundAudiences?: string[];

	/** Roles allowed for tokens signed with this key, if restricted. */
	allowedRoles?: string[];

	/** Flag indicating that the token's `email_verified` claim must be true, for email linking. */
	requireVerifiedEmail: boolean;

	/**
	 * Claim to use as the effective subject when resolving identity, instead
	 * of the standard `sub` claim (e.g. `uid` for an Okta custom Authorization
	 * Server, whose access-token `sub` is often the user's login rather than
	 * a stable id). Must be an immutable, issuer-assigned identifier —
	 * pointing this at a mutable attribute (email, username) turns the
	 * binding key into a forgeable value.
	 */
	subjectClaim: string;
}
