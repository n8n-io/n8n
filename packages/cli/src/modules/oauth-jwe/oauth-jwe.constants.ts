export const JWE_PRIVATE_KEY_TYPE = 'jwe.private-key';

/**
 * Supported algorithms for the instance OAuth JWE key pair. Each algorithm
 * has at most one active private-key row in `deployment_key`, enforced by a
 * partial unique index on `(type, algorithm)`.
 */
export const JWE_KEY_ALGORITHMS = ['RSA-OAEP-256'] as const;
export type JweKeyAlgorithm = (typeof JWE_KEY_ALGORITHMS)[number];

export const JWE_KEY_USE = 'enc';
export const JWE_KEY_CACHE_KEY = 'jwe:key-pair';
