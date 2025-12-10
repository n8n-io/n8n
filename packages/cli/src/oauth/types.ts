import { Time } from '@n8n/constants';

export type CsrfStateRequired = {
	/** Random CSRF token, used to verify the signature of the CSRF state */
	token: string;
	/** Creation timestamp of the CSRF state. Used for expiration.  */
	createdAt: number;
};

export type CreateCsrfStateData = {
	cid: string;
	[key: string]: unknown;
};

export type CsrfState = CsrfStateRequired & CreateCsrfStateData;

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
