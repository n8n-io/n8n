import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies the Cal.com webhook signature.
 *
 * Cal.com signs webhooks using HMAC SHA-256:
 * 1. Create HMAC SHA-256 hash of the raw payload using the secret as key
 * 2. Encode the hash as a hex string
 * 3. Compare with the value in the `X-Cal-Signature-256` header
 *
 * @returns true if the signature is valid, false otherwise
 * @returns true if no secret is configured (backward compatibility with old triggers)
 */
export function verifySignature(this: IWebhookFunctions): boolean {
	const req = this.getRequestObject();
	const webhookData = this.getWorkflowStaticData('node');
	const secret = webhookData.webhookSecret;

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
			const receivedSignature = req.header('x-cal-signature-256');
			return typeof receivedSignature === 'string' ? receivedSignature : null;
		},
	});
}
