import crypto from 'crypto';

import { WAITING_TOKEN_QUERY_PARAM } from '@/constants';

/**
 * Generate signature token from url and secret
 */
export function generateUrlSignature(url: string, secret: string) {
	const token = crypto.createHmac('sha256', secret).update(url).digest('hex');
	return token;
}

/**
 * Prepare url for signing
 */
export function prepareUrlForSigning(url: URL) {
	return `${url.host}${url.pathname}${url.search}`;
}

/**
 * Sign a URL with HMAC signature and return the signed URL string.
 * Adds a signature query parameter to prevent URL guessing attacks.
 */
export function signUrl(urlString: string, secret: string): string {
	const url = new URL(urlString);
	const urlForSigning = prepareUrlForSigning(url);
	const token = generateUrlSignature(urlForSigning, secret);
	url.searchParams.set(WAITING_TOKEN_QUERY_PARAM, token);
	return url.toString();
}

/**
 * Validate a signed URL's signature using timing-safe comparison.
 * Returns true if the signature is valid, false otherwise.
 */
export function validateUrlSignature(url: URL, host: string, secret: string): boolean {
	try {
		const actualToken = url.searchParams.get(WAITING_TOKEN_QUERY_PARAM);
		if (!actualToken) return false;

		// Create URL for validation (without signature param)
		const urlForValidation = new URL(url.toString());
		urlForValidation.searchParams.delete(WAITING_TOKEN_QUERY_PARAM);
		// Use the provided host for validation (handles reverse proxy scenarios)
		const urlString = `${host}${urlForValidation.pathname}${urlForValidation.search}`;

		const expectedToken = generateUrlSignature(urlString, secret);

		return crypto.timingSafeEqual(Buffer.from(actualToken), Buffer.from(expectedToken));
	} catch {
		return false;
	}
}
