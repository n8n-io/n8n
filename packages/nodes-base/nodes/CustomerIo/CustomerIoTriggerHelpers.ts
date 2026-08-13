import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies the Customer.io reporting webhook signature.
 *
 * Customer.io signs reporting webhooks using HMAC SHA-256:
 * 1. Combine the version, timestamp, and raw body as `v0:<timestamp>:<body>`
 * 2. Compute the HMAC SHA-256 hash using the webhook signing key
 * 3. Compare hex digest with the `X-CIO-Signature` header
 *
 * @returns true if the signature is valid, false otherwise
 * @returns true if no signing key is configured (backward compatibility)
 */
export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	try {
		const credential = await this.getCredentials('customerIoApi');
		const req = this.getRequestObject();

		const signingKey = credential?.webhookSigningKey;
		const hasSigningKey = typeof signingKey === 'string' && signingKey.length > 0;

		const timestamp = req.header('x-cio-timestamp');

		return verifySignatureGeneric({
			getExpectedSignature: () => {
				if (!hasSigningKey || !timestamp || !req.rawBody) {
					return null;
				}

				const hmac = createHmac('sha256', signingKey);

				if (Buffer.isBuffer(req.rawBody)) {
					hmac.update(`v0:${timestamp}:`);
					hmac.update(req.rawBody);
				} else {
					const rawBodyString =
						typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.rawBody);
					hmac.update(`v0:${timestamp}:${rawBodyString}`);
				}

				return hmac.digest('hex');
			},
			skipIfNoExpectedSignature: !hasSigningKey,
			getActualSignature: () => {
				const actualSignature = req.header('x-cio-signature');
				return typeof actualSignature === 'string' ? actualSignature : null;
			},
			getTimestamp: () => (typeof timestamp === 'string' ? timestamp : null),
			skipIfNoTimestamp: !hasSigningKey,
		});
	} catch (error) {
		return false;
	}
}
