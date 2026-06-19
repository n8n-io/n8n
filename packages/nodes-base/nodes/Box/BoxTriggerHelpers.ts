import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

const MAX_TIMESTAMP_AGE_SECONDS = 600;

function computeSignature(signingKey: string, rawBody: Buffer | string, timestamp: string): string {
	const hmac = createHmac('sha256', signingKey);
	const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
	hmac.update(payload);
	hmac.update(timestamp);
	return hmac.digest('base64');
}

export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	try {
		const credential = await this.getCredentials('boxOAuth2Api');
		const primaryKey = credential.signingKeyPrimary;
		const secondaryKey = credential.signingKeySecondary;

		const primaryConfigured = !!primaryKey && typeof primaryKey === 'string';
		const secondaryConfigured = !!secondaryKey && typeof secondaryKey === 'string';

		if (!primaryConfigured && !secondaryConfigured) {
			return true;
		}

		const req = this.getRequestObject();
		const timestampHeader = req.header('box-delivery-timestamp');
		if (typeof timestampHeader !== 'string' || timestampHeader.length === 0) {
			return false;
		}

		const timestampMs = Date.parse(timestampHeader);
		if (!Number.isFinite(timestampMs)) {
			return false;
		}
		const timestampSec = Math.floor(timestampMs / 1000);

		if (!req.rawBody) {
			return false;
		}

		const tryVerify = (signingKey: string, signatureHeader: string): boolean =>
			verifySignatureGeneric({
				getExpectedSignature: () => computeSignature(signingKey, req.rawBody, timestampHeader),
				getActualSignature: () => {
					const sig = req.header(signatureHeader);
					return typeof sig === 'string' ? sig : null;
				},
				getTimestamp: () => timestampSec,
				maxTimestampAgeSeconds: MAX_TIMESTAMP_AGE_SECONDS,
			});

		if (primaryConfigured && tryVerify(primaryKey, 'box-signature-primary')) {
			return true;
		}
		if (secondaryConfigured && tryVerify(secondaryKey, 'box-signature-secondary')) {
			return true;
		}
		return false;
	} catch (error) {
		return false;
	}
}
