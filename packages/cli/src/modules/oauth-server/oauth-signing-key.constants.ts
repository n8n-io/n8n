import { Time } from '@n8n/constants';

export { OAUTH_SIGNING_KEY_TYPE } from '@n8n/db';

/** ECDSA with the P-256 curve and SHA-256 (RFC 7518 §3.4). */
export const OAUTH_SIGNING_ALGORITHM = 'ES256';
export const OAUTH_SIGNING_KEY_USE = 'sig';
export const OAUTH_SIGNING_CURVE = 'P-256';

/** How long a process uses its in-memory list of public keys before it reads the list again. */
export const SIGNING_KEYS_REFRESH_MS = 5 * Time.minutes.toMilliseconds;

/**
 * An unknown `kid` reads the list again only when the list is older than
 * this, so tokens with made-up kids cannot load the database.
 */
export const UNKNOWN_KID_REFRESH_MS = 30 * Time.seconds.toMilliseconds;

/** RFC 9068 §2.1 `typ` values. */
export const ACCESS_TOKEN_TYPES = ['at+jwt', 'application/at+jwt'] as const;

export const OAUTH_ACCESS_TOKEN_TTL_SECONDS = 1 * Time.hours.toSeconds;

/** A retired key must verify every token it signed, with margin for clock skew. */
export const RETIRED_SIGNING_KEY_GRACE_MS =
	OAUTH_ACCESS_TOKEN_TTL_SECONDS * Time.seconds.toMilliseconds + 5 * Time.minutes.toMilliseconds;
