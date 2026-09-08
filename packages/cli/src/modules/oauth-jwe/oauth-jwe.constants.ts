export const JWE_PRIVATE_KEY_TYPE = 'jwe.private-key';

/**
 * RSA `alg` values accepted in the public JWKS for `kty: 'RSA'`. Drives the
 * RSA branch of the JWKS Zod schema in `oauth-jwe.schemas.ts`.
 */
export const JWE_RSA_ALGORITHMS = ['RSA-OAEP-256'] as const;
export type JweRsaAlgorithm = (typeof JWE_RSA_ALGORITHMS)[number];

/**
 * EC `alg` values accepted in the public JWKS for `kty: 'EC'`. Defined for
 * the JWKS contract before the service can produce EC keys, so adding EC
 * support later is purely additive on the service/constants side.
 */
export const JWE_EC_ALGORITHMS = [
	'ECDH-ES',
	'ECDH-ES+A128KW',
	'ECDH-ES+A192KW',
	'ECDH-ES+A256KW',
] as const;
export type JweEcAlgorithm = (typeof JWE_EC_ALGORITHMS)[number];

/**
 * Supported algorithms for the instance OAuth JWE key pair. Each algorithm
 * has at most one active private-key row in `deployment_key`, enforced by a
 * partial unique index on `(type, algorithm)`. Currently equal to
 * {@link JWE_RSA_ALGORITHMS}; will be reconciled with {@link JWE_EC_ALGORITHMS}
 * once EC key generation is wired in the service.
 */
export const JWE_KEY_ALGORITHMS = ['RSA-OAEP-256'] as const;
export type JweKeyAlgorithm = (typeof JWE_KEY_ALGORITHMS)[number];

export const JWE_KEY_USE = 'enc';
export const JWE_KEY_CACHE_KEY = 'jwe:key-pair';
