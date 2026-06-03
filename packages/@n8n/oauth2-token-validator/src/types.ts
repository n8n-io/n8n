import type { JSONWebKeySet, JWTPayload } from 'jose';

/**
 * The decoded, verified claims carried by a token. This is the standard JWT
 * payload (`sub`, `iss`, `aud`, `exp`, ...) plus any custom claims the IdP
 * includes (e.g. `groups`, `scope`, `email`).
 */
export type TokenClaims = JWTPayload;

/**
 * Options describing the trust anchor a token is validated against.
 *
 * Key resolution precedence:
 *  1. `jwks`    - validate against a static, in-memory key set (no network).
 *  2. `jwksUri` - fetch keys from this URL (cached across calls).
 *  3. neither   - discover the `jwks_uri` from `issuer` via
 *                 `/.well-known/openid-configuration`, then fetch (cached).
 */
export interface JwksValidationOptions {
	/** Expected `iss` claim. Also used for OIDC discovery when no jwksUri/jwks. */
	issuer: string;

	/** Expected `aud` claim. When omitted, audience is not checked. */
	audience?: string | string[];

	/** Static key set. Takes precedence over `jwksUri` and discovery. */
	jwks?: JSONWebKeySet;

	/** Explicit JWKS endpoint. Skips discovery; used when set and `jwks` is not. */
	jwksUri?: string;
}
