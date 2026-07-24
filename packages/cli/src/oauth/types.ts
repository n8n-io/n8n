import { Time } from '@n8n/constants';

export type CsrfStateRequired = {
	/** Random CSRF token, used to verify the signature of the CSRF state */
	token: string;
	/** Creation timestamp of the CSRF state. Used for expiration.  */
	createdAt: number;
	/**
	 * Encrypted stringified CSRF state data. Legacy field: the payload now lives
	 * server-side in the per-flow cache (keyed by the state token) instead of in
	 * the URL, so newly minted states omit it. Kept optional to keep in-flight
	 * flows started before this change resolvable at the callback.
	 */
	data?: string;
};

export type CreateCsrfStateData = {
	cid: string;
	origin: 'static-credential' | 'dynamic-credential';
	resource?: string;
	/**
	 * SHA-256 hash of the `n8n-oauth-binding` cookie value captured at flow
	 * initiation. Verified at callback to ensure the same browser is completing
	 * the flow. Present only when `N8N_OAUTH_BROWSER_BINDING` was enabled at
	 * the time of /auth; absent for flows initiated before/without the feature.
	 */
	bindingHash?: string;
	[key: string]: unknown;
};

export type CsrfState = CsrfStateRequired;

export const MAX_CSRF_AGE = 5 * Time.minutes.toMilliseconds;

export const enum OauthVersion {
	V1 = 1,
	V2 = 2,
}

export interface OAuth1CredentialData {
	signatureMethod: 'HMAC-SHA256' | 'HMAC-SHA512' | 'HMAC-SHA1';
	consumerKey: string;
	consumerSecret: string;
	authUrl: string;
	accessTokenUrl: string;
	requestTokenUrl: string;
}

export const algorithmMap = {
	'HMAC-SHA256': 'sha256',
	'HMAC-SHA512': 'sha512',
	'HMAC-SHA1': 'sha1',
} as const;
