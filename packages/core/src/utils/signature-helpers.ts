import crypto from 'crypto';

/**
 * Generate signature token from url and secret
 */
export function generateUrlSignature(url: string, secret: string) {
	const token = crypto.createHmac('sha256', secret).update(url).digest('hex');
	return token;
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
export function prepareUrlForSigning(url: URL) {
	return `${url.host}${url.pathname}${url.search}`;
}
