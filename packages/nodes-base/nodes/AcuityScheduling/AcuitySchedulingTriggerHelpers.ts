import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Verifies the Acuity Scheduling webhook signature.
 *
 * Acuity signs webhooks using HMAC SHA-256:
 * 1. Create HMAC SHA-256 hash of the request body using the API key as the secret
 * 2. Encode the hash in base64 format
 * 3. Compare with the signature in the `x-acuity-signature` header
 *
 * Note: For OAuth2 authentication, no API key is available for verification,
 * so we skip signature verification (backward compatible).
 *
 * @see https://developers.acuityscheduling.com/docs/webhooks#verifying-webhook-requests
 * @returns true if the signature is valid, false otherwise
 * @returns true if no API key is available (OAuth2 or backward compatibility)
 */
export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	const req = this.getRequestObject();
	const authentication = this.getNodeParameter('authentication', 'apiKey') as string;

	// For OAuth2, we don't have an API key to verify signatures
	// Skip verification for backward compatibility
	if (authentication !== 'apiKey') {
		return true;
	}

	let apiKey: string | undefined;
	try {
		const credentials = await this.getCredentials('acuitySchedulingApi');
		apiKey = credentials?.apiKey as string | undefined;
	} catch {
		// If credentials can't be retrieved, skip verification
		return true;
	}

	return verifySignatureGeneric({
		getExpectedSignature: () => {
			if (!apiKey || !req.rawBody) {
				return null;
			}
			const hmac = createHmac('sha256', apiKey);
			const payload = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
			hmac.update(payload);
			return hmac.digest('base64');
		},
		skipIfNoExpectedSignature: !apiKey,
		getActualSignature: () => {
			const receivedSignature = req.header('x-acuity-signature');
			return typeof receivedSignature === 'string' ? receivedSignature : null;
		},
	});
}
