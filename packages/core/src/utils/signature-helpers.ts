import crypto from 'crypto';

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
