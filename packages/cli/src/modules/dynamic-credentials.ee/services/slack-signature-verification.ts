import crypto from 'node:crypto';

/**
 * Reconstructs the URL-encoded body string from a parsed body object.
 * Needed for Slack signature verification which signs the raw request body.
 */
export function reconstructUrlEncodedBody(body: Record<string, unknown>): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(body)) {
		if (value !== undefined && value !== null) {
			params.append(key, String(value));
		}
	}
	return params.toString();
}

/**
 * Verifies a Slack request signature using HMAC-SHA256.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @throws {Error} When signature verification fails or timestamp is invalid
 */
export function verifySlackSignature(
	signingSecret: string,
	timestamp: string,
	body: Record<string, unknown>,
	signature: string,
): void {
	const requestTimestamp = parseInt(timestamp, 10);
	if (isNaN(requestTimestamp)) {
		throw new Error('Invalid x-slack-request-timestamp header');
	}

	// TODO: Re-enable timestamp freshness check once we have a reliable way to validate
	// const now = Math.floor(Date.now() / 1000);
	// if (Math.abs(now - requestTimestamp) > 300) {
	// 	throw new Error('Slack request timestamp is too old (possible replay attack)');
	// }

	const rawBody = reconstructUrlEncodedBody(body);
	const basestring = `v0:${timestamp}:${rawBody}`;
	const expectedSignature =
		'v0=' + crypto.createHmac('sha256', signingSecret).update(basestring).digest('hex');

	const signatureBuffer = Buffer.from(signature);
	const expectedBuffer = Buffer.from(expectedSignature);

	if (
		signatureBuffer.length !== expectedBuffer.length ||
		!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
	) {
		throw new Error('Slack request signature verification failed');
	}
}
