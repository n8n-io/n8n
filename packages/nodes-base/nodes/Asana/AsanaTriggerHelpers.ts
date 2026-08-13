import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies the Asana webhook signature.
 *
 * Asana signs webhooks using HMAC SHA-256:
 * 1. Compute an HMAC SHA-256 of the raw request body using the shared secret
 *    received during the initial handshake (X-Hook-Secret header)
 * 2. Encode the digest as a hexadecimal string
 * 3. Compare against the value of the `X-Hook-Signature` header
 *
 * @returns true if the signature is valid, or no secret has been stored yet
 *          (backward compatibility with webhooks created before verification
 *          was introduced); false otherwise.
 */
export function verifySignature(this: IWebhookFunctions): boolean {
	const req = this.getRequestObject();
	const webhookData = this.getWorkflowStaticData('node');
	const secret = webhookData.hookSecret;

	return verifySignatureGeneric({
		getExpectedSignature: () => {
			if (!secret || typeof secret !== 'string' || !req.rawBody) {
				return null;
			}
			const hmac = createHmac('sha256', secret);
			const payload = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
			hmac.update(payload);
			return hmac.digest('hex');
		},
		skipIfNoExpectedSignature: !secret || typeof secret !== 'string',
		getActualSignature: () => {
			const receivedSignature = req.header('x-hook-signature');
			return typeof receivedSignature === 'string' ? receivedSignature : null;
		},
	});
}
