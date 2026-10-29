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
 * Builds the `/<executionId>/<nodeId>` suffix of a waiting-webhook resume URL.
 *
 * The node id is client-supplied and stored verbatim, so it is percent-encoded to keep it
 * within one path segment of the signed URL. Ids of exactly `.` or `..` are the exception —
 * no encoding of a dot segment survives URL normalisation, so those collapse the path and
 * yield a link that does not resolve. The execution id is server-generated and already URL-safe.
 */
export function buildResumeUrlSuffix(executionId: string, nodeId: string): string {
	return `/${executionId}/${encodeURIComponent(nodeId)}`;
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
