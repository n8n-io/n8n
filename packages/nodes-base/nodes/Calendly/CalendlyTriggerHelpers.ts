import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

/**
 * Calendly sends the signature in the `Calendly-Webhook-Signature` header
 * with the format `t=<timestamp>,v1=<hex-signature>`. The signature is the
 * HMAC SHA-256 of `<timestamp>.<raw-body>` using the `signing_key` provided
 * when the webhook subscription was created.
 */
function parseSignatureHeader(header: string | null): {
	timestamp: string | null;
	signature: string | null;
} {
	if (!header) {
		return { timestamp: null, signature: null };
	}
	const parts = header.split(',');
	let timestamp: string | null = null;
	let signature: string | null = null;
	for (const part of parts) {
		const [rawKey, ...rest] = part.split('=');
		if (!rawKey || rest.length === 0) continue;
		const key = rawKey.trim();
		const value = rest.join('=').trim();
		if (key === 't') {
			timestamp = value;
		} else if (key === 'v1') {
			signature = value;
		}
	}
	return { timestamp, signature };
}

/**
 * Verifies the Calendly webhook signature.
 *
 * Returns `true` if the signature is valid or if no `webhookSecret` is
 * stored (backward compatibility with webhook subscriptions created before
 * signing was supported).
 */
export function verifySignature(this: IWebhookFunctions): boolean {
	const req = this.getRequestObject();
	const webhookData = this.getWorkflowStaticData('node');
	const secret = webhookData.webhookSecret;
	const hasSecret = typeof secret === 'string' && secret.length > 0;

	const headerValue = req.header('calendly-webhook-signature');
	const { timestamp, signature } = parseSignatureHeader(
		typeof headerValue === 'string' ? headerValue : null,
	);

	return verifySignatureGeneric({
		getExpectedSignature: () => {
			if (!hasSecret || typeof secret !== 'string' || !req.rawBody || !timestamp) {
				return null;
			}
			const payload = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
			const hmac = createHmac('sha256', secret);
			hmac.update(`${timestamp}.`);
			hmac.update(payload);
			return hmac.digest('hex');
		},
		skipIfNoExpectedSignature: !hasSecret,
		getActualSignature: () => signature,
		getTimestamp: hasSecret ? () => timestamp : undefined,
	});
}
