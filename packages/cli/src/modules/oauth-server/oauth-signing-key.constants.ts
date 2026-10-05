import { Time } from '@n8n/constants';

export { OAUTH_SIGNING_KEY_TYPE } from '@n8n/db';

/** ECDSA with the P-256 curve and SHA-256 (RFC 7518 §3.4). */
export const OAUTH_SIGNING_ALGORITHM = 'ES256';
export const OAUTH_SIGNING_KEY_USE = 'sig';
export const OAUTH_SIGNING_CURVE = 'P-256';

/**
 * Public signing keys only. The private key stays in process memory.
 * Delete this entry whenever a signing key is added or changes status.
 */
export const OAUTH_SIGNING_KEYS_CACHE_KEY = 'oauth-server:signing-keys';

/** RFC 9068 §2.1 `typ` values. */
export const ACCESS_TOKEN_TYPES = ['at+jwt', 'application/at+jwt'] as const;

export const OAUTH_ACCESS_TOKEN_TTL_SECONDS = 1 * Time.hours.toSeconds;

/** A retired key must verify every token it signed, with margin for clock skew. */
export const RETIRED_SIGNING_KEY_GRACE_MS =
	OAUTH_ACCESS_TOKEN_TTL_SECONDS * Time.seconds.toMilliseconds + 5 * Time.minutes.toMilliseconds;
