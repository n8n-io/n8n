import { createHmac, timingSafeEqual } from 'crypto';

import { WAITING_TOKEN_QUERY_PARAM } from '../constants';

/**
 * Generate HMAC-SHA256 signature from URL and secret.
 * Used to create tamper-proof resume URLs that include action parameters.
 */
export function generateUrlSignature(url: string, secret: string): string {
	return createHmac('sha256', secret).update(url).digest('hex');
}

/**
 * Prepare url for signing
 */
export function prepareUrlForSigning(url: URL): string {
	const urlForSigning = new URL(url.toString());
	urlForSigning.searchParams.delete(WAITING_TOKEN_QUERY_PARAM);
	return `${urlForSigning.pathname}${urlForSigning.search}`;
}

/**
 * Validate that a provided signature matches the expected HMAC signature for the URL.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param providedSignature - The signature from the request
 * @param url - The full request URL
 * @param secret - The HMAC secret (instance signature secret)
 * @returns true if signature is valid
 */
export function validateUrlSignature(providedSignature: string, url: URL, secret: string): boolean {
	const urlString = prepareUrlForSigning(url);
	const expectedSignature = generateUrlSignature(urlString, secret);

	if (providedSignature.length !== expectedSignature.length) {
		return false;
	}

	return timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature));
}
